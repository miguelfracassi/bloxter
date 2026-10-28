-- Bloxter: esquema do banco (Neon / Postgres)
-- A API cria estas tabelas sozinha na primeira requisição.
-- Este arquivo existe só pra você poder rodar manualmente no SQL Editor do Neon, se quiser.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  bio           TEXT NOT NULL DEFAULT '',
  link          TEXT NOT NULL DEFAULT '',
  avatar        TEXT,
  avatar_v      BIGINT NOT NULL DEFAULT 0,
  rp_category TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  roblox_username TEXT NOT NULL DEFAULT '',
  roblox_user_id BIGINT,
  roblox_avatar TEXT NOT NULL DEFAULT '',
  onboarding_done BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_data TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_articles_created_idx ON blog_articles (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_user_idx ON posts (user_id, id DESC);

CREATE TABLE IF NOT EXISTS promoted_posts (
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  media TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);
CREATE INDEX IF NOT EXISTS stories_active_idx ON stories (expires_at, user_id, id);

CREATE TABLE IF NOT EXISTS story_views (
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);

CREATE TABLE IF NOT EXISTS likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id, id);
CREATE INDEX IF NOT EXISTS comments_user_idx ON comments (user_id, id DESC);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to_uid INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id, id);
CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS reposts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS reposts_user_idx ON reposts (user_id, id DESC);
CREATE INDEX IF NOT EXISTS reposts_post_idx ON reposts (post_id, id DESC);

CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages (sender_id, receiver_id, id);
CREATE INDEX IF NOT EXISTS messages_recv_idx ON messages (receiver_id, read_at);
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_direct_group_adds BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS chat_groups (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS group_members (
  group_id INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_members (user_id, group_id);
CREATE TABLE IF NOT EXISTS group_invites (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, invitee_id)
);
CREATE INDEX IF NOT EXISTS group_invites_inbox_idx ON group_invites (invitee_id, status, created_at DESC);
CREATE TABLE IF NOT EXISTS group_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_messages_feed_idx ON group_messages (group_id, id DESC);

CREATE TABLE IF NOT EXISTS developer_apps (
  client_id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  client_secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS developer_apps_owner_idx ON developer_apps (owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES developer_apps(client_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scopes TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  token_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES developer_apps(client_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scopes TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oauth_tokens_expiry_idx ON oauth_access_tokens (expires_at);


CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL
);
INSERT INTO site_settings (setting_key, setting_value) VALUES ('access_open', 'false') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO site_settings (setting_key, setting_value) VALUES ('maintenance_enabled', 'false'), ('maintenance_responsible', 'Equipe Bloxter'), ('maintenance_reason', 'Atualizações'), ('maintenance_updates', '') ON CONFLICT (setting_key) DO NOTHING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pageup BOOLEAN NOT NULL DEFAULT false;


-- Imagens dos posts (até 4 por post), notificações e preferências de notificação
CREATE TABLE IF NOT EXISTS post_images (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  pos SMALLINT NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_images_post_idx ON post_images (post_id, pos, id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_prefs TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_tour_seen BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  comment_id INTEGER,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, id DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;

-- Administração (/administracao): banimento de contas e recursos liberados para todos.
-- banned_at preenchido = conta banida (não consegue entrar nem usar a sessão). ban_reason é o motivo mostrado à pessoa.
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT NOT NULL DEFAULT '';
-- Recursos começam bloqueados; "Liberar" na aba Recursos muda para 'true' e vale para todos. feature_<nome>_at guarda quando foi liberado.
INSERT INTO site_settings (setting_key, setting_value) VALUES ('feature_comments', 'false'), ('feature_likes', 'false'), ('feature_hashtags', 'false'), ('feature_discord', 'false') ON CONFLICT (setting_key) DO NOTHING;
