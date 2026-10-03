-- Undo auth tokens improvements: remove note field, protect field, and updated_at column

-- Drop the protect index first
DROP INDEX IF EXISTS idx_auth_tokens_protect;

-- Remove the updated_at column
ALTER TABLE auth_tokens
DROP COLUMN IF EXISTS updated_at;

-- Remove the protect column
ALTER TABLE auth_tokens
DROP COLUMN IF EXISTS protect;

-- Remove the note column
ALTER TABLE auth_tokens
DROP COLUMN IF EXISTS note;
