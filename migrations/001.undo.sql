DROP TRIGGER IF EXISTS prune_tags ON bookmarks_tags;
DROP FUNCTION IF EXISTS prune_tags;
DROP INDEX IF EXISTS idx_bookmarks_tags_bookmarks_id;
DROP INDEX IF EXISTS idx_bookmarks_tags_tags_id;
DROP TABLE IF EXISTS bookmarks_tags;
DROP TRIGGER IF EXISTS set_timestamp_tags ON tags;
DROP INDEX IF EXISTS idx_tags_owner;
DROP TABLE IF EXISTS tags;
DROP TRIGGER IF EXISTS set_timestamp_bookmarks ON bookmarks;
DROP INDEX IF EXISTS idx_bookmarks_owner;
DROP TABLE IF EXISTS bookmarks;
DROP TRIGGER IF EXISTS set_timestamp_auth_tokens ON auth_tokens;
DROP INDEX IF EXISTS idx_auth_tokens_owner;
DROP TABLE IF EXISTS auth_tokens;
DROP TRIGGER IF EXISTS set_timestamp_users ON users;
DROP TABLE IF EXISTS users;
DROP FUNCTION IF EXISTS trigger_set_timestamp;
DROP DOMAIN IF EXISTS valid_username;
DROP DOMAIN IF EXISTS email_address;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS citext;
