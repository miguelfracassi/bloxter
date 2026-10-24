const { neon } = require('@neondatabase/serverless');
const { extractHashtags } = require('./hashtags');

let sql;
function getSql() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não configurada');
    sql = neon(url);
  }
  return sql;
}

let schemaPromise = null;

async function createAll() {
  const s = getSql();
  await s`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    avatar TEXT,
    avatar_v BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE TABLE IF NOT EXISTS blog_articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_data TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS blog_articles_created_idx ON blog_articles (created_at DESC, id DESC)`;
  await s`CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS posts_user_idx ON posts (user_id, id DESC)`;
  await s`CREATE TABLE IF NOT EXISTS promoted_posts (
    post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL DEFAULT '',
    media TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
  )`;
  await s`CREATE INDEX IF NOT EXISTS stories_active_idx ON stories (expires_at, user_id, id)`;
  await s`CREATE TABLE IF NOT EXISTS story_views (
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (story_id, user_id)
  )`;
  await s`CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
  )`;
  await s`CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id)
  )`;
  await s`CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
  )`;
  await s`CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages (sender_id, receiver_id, id)`;
  await s`CREATE INDEX IF NOT EXISTS messages_recv_idx ON messages (receiver_id, read_at)`;
  await s`CREATE TABLE IF NOT EXISTS chat_groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
  )`;
  await s`CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_members (user_id, group_id)`;
  await s`CREATE TABLE IF NOT EXISTS group_invites (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, invitee_id)
  )`;
  await s`CREATE INDEX IF NOT EXISTS group_invites_inbox_idx ON group_invites (invitee_id, status, created_at DESC)`;
  await s`CREATE TABLE IF NOT EXISTS group_messages (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS group_messages_feed_idx ON group_messages (group_id, id DESC)`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_ai BOOLEAN NOT NULL DEFAULT false`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_followers BIGINT NOT NULL DEFAULT 0`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS rp_category TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_username TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_user_id BIGINT`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_avatar TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN NOT NULL DEFAULT false`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_direct_group_adds BOOLEAN NOT NULL DEFAULT false`;
  await s`CREATE TABLE IF NOT EXISTS developer_apps (
    client_id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    client_secret_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS developer_apps_owner_idx ON developer_apps (owner_id, created_at DESC)`;
  await s`CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
    code_hash TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES developer_apps(client_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redirect_uri TEXT NOT NULL,
    scopes TEXT NOT NULL,
    code_challenge TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE TABLE IF NOT EXISTS oauth_access_tokens (
    token_hash TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES developer_apps(client_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scopes TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS oauth_tokens_expiry_idx ON oauth_access_tokens (expires_at)`;
  await s`CREATE TABLE IF NOT EXISTS bot_keys (
    key_hash TEXT PRIMARY KEY,
    key_prefix TEXT NOT NULL,
    client_id TEXT NOT NULL REFERENCES developer_apps(client_id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'bot',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
  )`;
  await s`CREATE INDEX IF NOT EXISTS bot_keys_client_idx ON bot_keys (client_id)`;
  await s`CREATE TABLE IF NOT EXISTS bot_missions (
    client_id TEXT NOT NULL REFERENCES developer_apps(client_id) ON DELETE CASCADE,
    mission_key TEXT NOT NULL,
    title TEXT NOT NULL,
    reward INTEGER NOT NULL CHECK (reward BETWEEN 1 AND 50),
    repeatable BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (client_id, mission_key)
  )`;
  await s`CREATE TABLE IF NOT EXISTS bot_mission_completions (
    id SERIAL PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES developer_apps(client_id) ON DELETE CASCADE,
    mission_key TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward INTEGER NOT NULL,
    once BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE UNIQUE INDEX IF NOT EXISTS bot_completions_once_idx ON bot_mission_completions (client_id, mission_key, user_id) WHERE once`;
  await s`CREATE INDEX IF NOT EXISTS bot_completions_user_idx ON bot_mission_completions (client_id, user_id)`;
  // Hashtags: uma linha por (post, tag). created_at repete a data do post para o ranking "em alta".
  await s`CREATE TABLE IF NOT EXISTS post_hashtags (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, tag)
  )`;
  await s`CREATE INDEX IF NOT EXISTS post_hashtags_tag_idx ON post_hashtags (tag, post_id DESC)`;
  await s`CREATE INDEX IF NOT EXISTS post_hashtags_recent_idx ON post_hashtags (created_at DESC)`;
  // Rankings criados por apps de desenvolvedor (API de bots).
  await s`CREATE TABLE IF NOT EXISTS app_rankings (
    client_id TEXT NOT NULL REFERENCES developer_apps(client_id) ON DELETE CASCADE,
    ranking_key TEXT NOT NULL,
    title TEXT NOT NULL,
    sort_order TEXT NOT NULL DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
    unit TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (client_id, ranking_key)
  )`;
  await s`CREATE TABLE IF NOT EXISTS app_ranking_scores (
    client_id TEXT NOT NULL,
    ranking_key TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (client_id, ranking_key, user_id),
    FOREIGN KEY (client_id, ranking_key) REFERENCES app_rankings (client_id, ranking_key) ON DELETE CASCADE
  )`;
  await s`CREATE INDEX IF NOT EXISTS app_ranking_scores_score_idx ON app_ranking_scores (client_id, ranking_key, score)`;
  await s`CREATE TABLE IF NOT EXISTS site_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
  )`;
  // Migra instalações antigas em que site_settings usava nomes como key/value.
  // CREATE TABLE IF NOT EXISTS não altera uma tabela já existente.
  await s`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS setting_key TEXT`;
  await s`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS setting_value TEXT`;
  await s`DO $$
    DECLARE legacy_column TEXT;
    BEGIN
      FOREACH legacy_column IN ARRAY ARRAY['key', 'name', 'setting', 'setting_name'] LOOP
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'site_settings' AND column_name = legacy_column
        ) THEN
          EXECUTE format(
            'UPDATE site_settings SET setting_key = %I::text WHERE setting_key IS NULL AND %I IS NOT NULL',
            legacy_column, legacy_column
          );
        END IF;
      END LOOP;
      FOREACH legacy_column IN ARRAY ARRAY['value', 'enabled', 'is_enabled', 'content'] LOOP
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'site_settings' AND column_name = legacy_column
        ) THEN
          EXECUTE format(
            'UPDATE site_settings SET setting_value = %I::text WHERE setting_value IS NULL AND %I IS NOT NULL',
            legacy_column, legacy_column
          );
        END IF;
      END LOOP;
    END $$`;
  await s`UPDATE site_settings SET setting_key = 'legacy_' || ctid::text WHERE setting_key IS NULL`;
  await s`UPDATE site_settings SET setting_value = 'false' WHERE setting_value IS NULL`;
  await s`CREATE UNIQUE INDEX IF NOT EXISTS site_settings_setting_key_uidx ON site_settings (setting_key)`;
  await s`INSERT INTO site_settings (setting_key, setting_value) VALUES ('access_open', 'false') ON CONFLICT (setting_key) DO NOTHING`;
  await s`INSERT INTO site_settings (setting_key, setting_value) VALUES ('maintenance_enabled', 'false'), ('maintenance_responsible', 'Equipe Bloxter'), ('maintenance_reason', 'Atualizações'), ('maintenance_updates', '') ON CONFLICT (setting_key) DO NOTHING`;

  await backfillHashtags(s);
}

// Uma vez só: lê os posts que já existiam antes das hashtags e grava as tags deles.
// Seguro rodar em paralelo (ON CONFLICT DO NOTHING); a marca em site_settings evita repetir.
async function backfillHashtags(s) {
  const [done] = await s`SELECT setting_value FROM site_settings WHERE setting_key = 'hashtags_backfilled'`;
  if (done) return;
  let after = 0;
  for (;;) {
    const posts = await s`SELECT id, body, created_at FROM posts WHERE id > ${after} AND position('#' in body) > 0 ORDER BY id LIMIT 500`;
    if (!posts.length) break;
    const ids = [];
    const tags = [];
    const dates = [];
    for (const p of posts) {
      for (const tag of extractHashtags(p.body)) {
        ids.push(p.id);
        tags.push(tag);
        dates.push(new Date(p.created_at).toISOString());
      }
    }
    if (ids.length) {
      await s`INSERT INTO post_hashtags (post_id, tag, created_at)
        SELECT * FROM unnest(${ids}::int[], ${tags}::text[], ${dates}::timestamptz[])
        ON CONFLICT DO NOTHING`;
    }
    after = posts[posts.length - 1].id;
    if (posts.length < 500) break;
  }
  await s`INSERT INTO site_settings (setting_key, setting_value) VALUES ('hashtags_backfilled', 'true') ON CONFLICT (setting_key) DO NOTHING`;
}

// Cria as tabelas (idempotente). Várias requisições podem chegar ao mesmo tempo
// na primeira vez, e o Postgres falha se duas rodarem CREATE TABLE juntas;
// por isso usamos uma promessa única por instância e tentamos de novo se der conflito.
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      let last;
      for (let i = 0; i < 4; i++) {
        try { await createAll(); return; } catch (e) {
          last = e;
          if (/DATABASE_URL/.test(String(e && e.message))) throw e;
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        }
      }
      throw last;
    })().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

module.exports = { getSql, ensureSchema };
