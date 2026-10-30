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
  await s`CREATE TABLE IF NOT EXISTS pinned_posts (
    post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device TEXT NOT NULL DEFAULT 'desktop' CHECK (device IN ('mobile','desktop')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id)`;
  await s`CREATE TABLE IF NOT EXISTS scheduled_pushes (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT NOT NULL DEFAULT '',
    send_at TIMESTAMPTZ NOT NULL,
    repeat TEXT NOT NULL DEFAULT 'none' CHECK (repeat IN ('none','daily','weekly')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','cancelled')),
    last_sent_at TIMESTAMPTZ,
    last_result TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS scheduled_pushes_due_idx ON scheduled_pushes (status, send_at)`;
  await s`CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL DEFAULT '',
    media TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
  )`;
  // Bancos criados por versões antigas podem ter a tabela stories sem estas colunas.
  await s`ALTER TABLE stories ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE stories ADD COLUMN IF NOT EXISTS media TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE stories ADD COLUMN IF NOT EXISTS link TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE stories ADD COLUMN IF NOT EXISTS music TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_title TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_start INTEGER NOT NULL DEFAULT 0`;
  await s`ALTER TABLE stories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`;
  await s`ALTER TABLE stories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')`;
  await s`CREATE INDEX IF NOT EXISTS stories_active_idx ON stories (expires_at, user_id, id)`;
  await s`CREATE TABLE IF NOT EXISTS story_views (
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (story_id, user_id)
  )`;
  // Compatibilidade com instalações antigas em que story_views usava viewer_id.
  await s`ALTER TABLE story_views ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`;
  await s`DO $migration$ DECLARE source_col TEXT; BEGIN
    SELECT column_name INTO source_col FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'story_views'
      AND column_name IN ('viewer_id', 'viewer_user_id', 'userId', 'viewerId')
    ORDER BY CASE column_name WHEN 'viewer_id' THEN 1 WHEN 'viewer_user_id' THEN 2 WHEN 'userId' THEN 3 ELSE 4 END
    LIMIT 1;
    IF source_col IS NOT NULL THEN
      EXECUTE format('UPDATE story_views SET user_id = %I WHERE user_id IS NULL', source_col);
    END IF;
  END; $migration$`;
  await s`CREATE UNIQUE INDEX IF NOT EXISTS story_views_story_user_uidx ON story_views (story_id, user_id) WHERE user_id IS NOT NULL`;
  await s`CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
  )`;
  await s`CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id, id)`;
  await s`CREATE INDEX IF NOT EXISTS comments_user_idx ON comments (user_id, id DESC)`;
  // Respostas: parent_id aponta para o comentário principal (a conversa fica agrupada nele);
  // reply_to_uid é a pessoa a quem a resposta se dirige. Curtidas de comentário em tabela própria.
  await s`ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE`;
  await s`ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to_uid INTEGER REFERENCES users(id) ON DELETE SET NULL`;
  await s`CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id, id)`;
  await s`CREATE TABLE IF NOT EXISTS comment_likes (
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (comment_id, user_id)
  )`;
  await s`CREATE TABLE IF NOT EXISTS reposts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, post_id)
  )`;
  await s`CREATE INDEX IF NOT EXISTS reposts_user_idx ON reposts (user_id, id DESC)`;
  await s`CREATE INDEX IF NOT EXISTS reposts_post_idx ON reposts (post_id, id DESC)`;
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
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS pageup BOOLEAN NOT NULL DEFAULT false`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS bannerup BOOLEAN NOT NULL DEFAULT false`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS banner TEXT`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_v BIGINT NOT NULL DEFAULT 0`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ`;
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
  await s`CREATE TABLE IF NOT EXISTS admin_api_keys (
    key_hash TEXT PRIMARY KEY,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
  )`;
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
  await s`INSERT INTO site_settings (setting_key, setting_value) VALUES ('onboarding_show_position', 'true'), ('onboarding_show_questions', 'true') ON CONFLICT (setting_key) DO NOTHING`;
  await s`CREATE TABLE IF NOT EXISTS post_images (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    pos SMALLINT NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS post_images_post_idx ON post_images (post_id, pos, id)`;
  await s`ALTER TABLE posts ADD COLUMN IF NOT EXISTS music TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE posts ADD COLUMN IF NOT EXISTS music_title TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE posts ADD COLUMN IF NOT EXISTS music_start INTEGER NOT NULL DEFAULT 0`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_prefs TEXT NOT NULL DEFAULT ''`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_tour_seen BOOLEAN NOT NULL DEFAULT false`;
  // Banimento de contas (feito em /administracao): banned_at preenchido = conta banida.
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT NOT NULL DEFAULT ''`;
  // Recursos liberados pela administração (começam bloqueados; "Liberar" em /administracao muda para 'true' e vale para todos).
  await s`INSERT INTO site_settings (setting_key, setting_value) VALUES ('feature_comments', 'false'), ('feature_likes', 'false'), ('feature_hashtags', 'false'), ('feature_discord', 'false'), ('feature_liquid_glass', 'false'), ('liquid_glass_prompt_enabled', 'false') ON CONFLICT (setting_key) DO NOTHING`;
  // Registro server-side para conceder o selo depois de dois dias com post + interação.
  await s`CREATE TABLE IF NOT EXISTS user_verification_days (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_day DATE NOT NULL,
    posted BOOLEAN NOT NULL DEFAULT false,
    interacted BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, activity_day)
  )`;
  await s`CREATE INDEX IF NOT EXISTS user_verification_days_eligible_idx ON user_verification_days (user_id, activity_day) WHERE posted AND interacted`;
  await s`CREATE TABLE IF NOT EXISTS user_verification_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    app_installed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  // Importa atividade anterior para que contas já ativas não precisem recomeçar do zero.
  await s`INSERT INTO user_verification_days (user_id, activity_day, posted, interacted)
    SELECT user_id, activity_day, bool_or(kind = 'post'), bool_or(kind = 'interaction') FROM (
      SELECT user_id, created_at::date AS activity_day, 'post' AS kind FROM posts
      UNION ALL SELECT user_id, created_at::date, 'interaction' FROM comments
      UNION ALL SELECT user_id, created_at::date, 'interaction' FROM reposts
      UNION ALL SELECT follower_id, created_at::date, 'interaction' FROM follows
    ) AS activity GROUP BY user_id, activity_day
    ON CONFLICT (user_id, activity_day) DO UPDATE SET posted = user_verification_days.posted OR EXCLUDED.posted, interacted = user_verification_days.interacted OR EXCLUDED.interacted`;
  await s`CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    comment_id INTEGER,
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
  )`;
  await s`CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, id DESC)`;
  await s`CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL`;
  await s`INSERT INTO site_settings (setting_key, setting_value) VALUES ('maintenance_enabled', 'false'), ('maintenance_responsible', 'Equipe Bloxter'), ('maintenance_reason', 'Atualizações'), ('maintenance_updates', '') ON CONFLICT (setting_key) DO NOTHING`;
  // Contratos de ingressamento da equipe (/team/contratoingressamento). `image` guarda o PNG do contrato assinado em base64.
  await s`CREATE TABLE IF NOT EXISTS team_contracts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL,
    ip_hash TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE INDEX IF NOT EXISTS team_contracts_signed_idx ON team_contracts (signed_at DESC, id DESC)`;
  // Denúncias de posts e contas (botão ⋯). O post fica registrado mesmo se for apagado depois (SET NULL).
  await s`CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL DEFAULT '',
    audience TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
  )`;
  await s`CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status, id DESC)`;
  await s`CREATE INDEX IF NOT EXISTS reports_reporter_idx ON reports (reporter_id, created_at DESC)`;

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
