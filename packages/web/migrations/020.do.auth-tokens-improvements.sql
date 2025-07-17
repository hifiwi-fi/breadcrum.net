-- Auth tokens improvements: note field and updated_at column

-- Add note field to auth_tokens table for user-defined session descriptions
ALTER TABLE auth_tokens
ADD COLUMN note TEXT CHECK (char_length(note) <= 255);

-- Add comment to document the column purpose
COMMENT ON COLUMN auth_tokens.note IS 'User-defined note to identify/describe the session (e.g., "Work laptop", "Home PC")';

-- Add protect field to prevent bulk deletion
ALTER TABLE auth_tokens
ADD COLUMN protect BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment to document the column purpose
COMMENT ON COLUMN auth_tokens.protect IS 'When true, prevents the token from being bulk deleted. Token can still expire.';

-- Add updated_at column to auth_tokens table
-- This is needed now that we allow editing the note field
ALTER TABLE auth_tokens
ADD COLUMN updated_at timestamptz NOT NULL DEFAULT NOW();

-- Set initial value to match created_at for existing rows
UPDATE auth_tokens
SET updated_at = created_at;

-- The trigger set_timestamp_auth_tokens already exists and will handle future updates

-- Add index for efficient filtering of protected tokens in bulk operations
CREATE INDEX idx_auth_tokens_protect ON auth_tokens(owner_id, protect) WHERE protect = TRUE;
