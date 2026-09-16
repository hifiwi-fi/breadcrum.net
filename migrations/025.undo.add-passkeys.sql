-- Note: Cannot remove 'passkey' value from auth_token_source enum in PostgreSQL
-- Once an enum value is added, it cannot be removed without recreating the entire type
-- This would require dropping all columns that use the type, which affects auth_tokens table
-- The 'passkey' value will remain but will not be used after this rollback

drop trigger if exists set_timestamp_passkeys on passkeys;
drop index if exists idx_passkeys_credential_id;
drop index if exists idx_passkeys_user_id;
drop table if exists passkeys;
drop type if exists authenticator_transport;