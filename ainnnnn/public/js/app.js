"""
API de Bot com missões e seguidores (saldo interno).

Fluxo:
  1. POST /register           -> cria usuário
  2. POST /login              -> devolve token de sessão do usuário
  3. POST /bots               -> (usuário logado) cria um bot e recebe a API KEY (mostrada 1x)
  4. O bot chama os endpoints com o header:  X-API-Key: <chave>
       GET  /bot/missions                 -> lista missões
       POST /bot/complete                 -> {"user_id":1,"mission_id":"m1"} completa e dá seguidores
       GET  /bot/users/<id>               -> vê seguidores do usuário
"""
import hashlib
import secrets
import sqlite3
import time
from functools import wraps

from flask import Flask, g, jsonify, request

DB = "bot_api.db"
app = Flask(__name__)

# Missões: id -> (descrição, seguidores de recompensa, repetível?)
MISSIONS = {
    "m1": {"title": "Entrar no servidor", "reward": 10, "repeatable": False},
    "m2": {"title": "Convidar um amigo", "reward": 50, "repeatable": True},
    "m3": {"title": "Completar o perfil", "reward": 25, "repeatable": False},
}


# ---------- banco ----------
def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_):
    d = g.pop("db", None)
    if d:
        d.close()


def init_db():
    c = sqlite3.connect(DB)
    c.executescript(
        """
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY, username TEXT UNIQUE, pw_hash TEXT, salt TEXT,
            followers INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER, exp REAL);
        CREATE TABLE IF NOT EXISTS bots(
            id INTEGER PRIMARY KEY, owner_id INTEGER, name TEXT, key_hash TEXT UNIQUE);
        CREATE TABLE IF NOT EXISTS completions(
            id INTEGER PRIMARY KEY, user_id INTEGER, mission_id TEXT, bot_id INTEGER, ts REAL);
        """
    )
    c.commit()
    c.close()


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


def hash_pw(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()


# ---------- auth ----------
def user_required(f):
    @wraps(f)
    def w(*a, **kw):
        tok = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        row = db().execute(
            "SELECT user_id FROM sessions WHERE token_hash=? AND exp>?", (sha(tok), time.time())
        ).fetchone()
        if not tok or not row:
            return jsonify(error="login necessário"), 401
        g.user_id = row["user_id"]
        return f(*a, **kw)
    return w


def bot_required(f):
    @wraps(f)
    def w(*a, **kw):
        key = request.headers.get("X-API-Key", "")
        row = db().execute("SELECT id FROM bots WHERE key_hash=?", (sha(key),)).fetchone()
        if not key or not row:
            return jsonify(error="API key inválida"), 401
        g.bot_id = row["id"]
        return f(*a, **kw)
    return w


# ---------- usuário ----------
@app.post("/register")
def register():
    d = request.get_json(force=True)
    u, p = d.get("username", "").strip(), d.get("password", "")
    if len(u) < 3 or len(p) < 6:
        return jsonify(error="username >=3 e senha >=6 caracteres"), 400
    salt = secrets.token_hex(8)
    try:
        db().execute("INSERT INTO users(username,pw_hash,salt) VALUES(?,?,?)", (u, hash_pw(p, salt), salt))
        db().commit()
    except sqlite3.IntegrityError:
        return jsonify(error="usuário já existe"), 409
    return jsonify(ok=True), 201


@app.post("/login")
def login():
    d = request.get_json(force=True)
    r = db().execute("SELECT * FROM users WHERE username=?", (d.get("username", ""),)).fetchone()
    if not r or not secrets.compare_digest(r["pw_hash"], hash_pw(d.get("password", ""), r["salt"])):
        return jsonify(error="credenciais inválidas"), 401
    tok = secrets.token_urlsafe(32)
    db().execute("INSERT INTO sessions VALUES(?,?,?)", (sha(tok), r["id"], time.time() + 86400))
    db().commit()
    return jsonify(token=tok, user_id=r["id"])


@app.post("/bots")
@user_required
def create_bot():
    name = (request.get_json(force=True).get("name") or "meu-bot")[:50]
    key = "bk_" + secrets.token_urlsafe(32)
    db().execute("INSERT INTO bots(owner_id,name,key_hash) VALUES(?,?,?)", (g.user_id, name, sha(key)))
    db().commit()
    return jsonify(api_key=key, aviso="guarde agora, não será mostrada de novo"), 201


# ---------- endpoints do bot ----------
@app.get("/bot/missions")
@bot_required
def missions():
    return jsonify(missions=[{"id": k, **v} for k, v in MISSIONS.items()])


@app.post("/bot/complete")
@bot_required
def complete():
    d = request.get_json(force=True)
    uid, mid = d.get("user_id"), d.get("mission_id")
    m = MISSIONS.get(mid)
    if not m:
        return jsonify(error="missão não existe"), 404
    if not db().execute("SELECT 1 FROM users WHERE id=?", (uid,)).fetchone():
        return jsonify(error="usuário não existe"), 404
    if not m["repeatable"] and db().execute(
        "SELECT 1 FROM completions WHERE user_id=? AND mission_id=?", (uid, mid)
    ).fetchone():
        return jsonify(error="missão já concluída"), 409
    db().execute("INSERT INTO completions(user_id,mission_id,bot_id,ts) VALUES(?,?,?,?)",
                 (uid, mid, g.bot_id, time.time()))
    db().execute("UPDATE users SET followers=followers+? WHERE id=?", (m["reward"], uid))
    db().commit()
    total = db().execute("SELECT followers FROM users WHERE id=?", (uid,)).fetchone()["followers"]
    return jsonify(ok=True, reward=m["reward"], followers=total)


@app.get("/bot/users/<int:uid>")
@bot_required
def get_user(uid):
    r = db().execute("SELECT id,username,followers FROM users WHERE id=?", (uid,)).fetchone()
    if not r:
        return jsonify(error="usuário não existe"), 404
    return jsonify(dict(r))


if __name__ == "__main__":
    init_db()
    app.run(port=5000)
