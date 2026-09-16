-- Remove the source column
alter table auth_tokens
drop column if exists source;

-- Drop the enum type (will fail if still in use elsewhere)
drop type if exists auth_token_source;
