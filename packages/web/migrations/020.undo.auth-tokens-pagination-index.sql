-- Remove composite index for auth tokens pagination queries
DROP INDEX CONCURRENTLY IF EXISTS idx_auth_tokens_pagination;
