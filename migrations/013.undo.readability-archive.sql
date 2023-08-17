-- 1. Drop the new column from the bookmarks table
ALTER TABLE bookmarks DROP COLUMN summary;

-- 2. Drop the trigger on the archives table
DROP TRIGGER IF EXISTS set_timestamp_archives ON archives;

-- 3. Drop the indexes created on the archives table
DROP INDEX IF EXISTS idx_archives_owner;
DROP INDEX IF EXISTS idx_archives_bookmark;

-- 4. Drop the archives table
DROP TABLE IF EXISTS archives;

-- 5. Drop the custom type
DROP TYPE IF EXISTS archive_extraction_method;
