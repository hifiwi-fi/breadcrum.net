-- Backfill: mark all stuck done=false records as done with an error.
-- Bookmarks and archives: no time filter — any existing done=false is stuck.
-- Episodes: 7-day window to preserve legitimately upcoming scheduled episodes.

UPDATE bookmarks
SET done = true,
    error = 'Timed out: marked done by backfill migration'
WHERE done = false;

UPDATE archives
SET done = true,
    error = 'Timed out: marked done by backfill migration'
WHERE done = false;

UPDATE episodes
SET done = true,
    error = 'Timed out: marked done by backfill migration'
WHERE done = false
  AND created_at < NOW() - INTERVAL '7 days';
