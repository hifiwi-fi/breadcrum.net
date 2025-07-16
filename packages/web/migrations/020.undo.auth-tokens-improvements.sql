-- Undo auth tokens improvements: remove note field and updated_at column

-- Remove the updated_at column
ALTER TABLE auth_tokens
DROP COLUMN IF EXISTS updated_at;

-- Remove the note column
ALTER TABLE auth_tokens
DROP COLUMN IF EXISTS note;
