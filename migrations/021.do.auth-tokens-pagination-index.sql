-- Add composite index for auth tokens pagination queries
-- This index supports efficient filtering by owner_id and sorting by (last_seen, jti)
-- for cursor-based pagination with microsecond precision
-- Note: This must be in a separate migration because CREATE INDEX CONCURRENTLY cannot run inside a transaction
CREATE INDEX CONCURRENTLY idx_auth_tokens_pagination
  ON auth_tokens(owner_id, last_seen DESC, jti DESC);
