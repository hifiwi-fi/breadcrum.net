-- Remove the pagination index
-- Note: This must be in a separate migration because DROP INDEX CONCURRENTLY cannot run inside a transaction
DROP INDEX CONCURRENTLY IF EXISTS idx_auth_tokens_pagination;
