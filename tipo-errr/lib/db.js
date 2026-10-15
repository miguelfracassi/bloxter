const { neon } = require('@neondatabase/serverless');

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
