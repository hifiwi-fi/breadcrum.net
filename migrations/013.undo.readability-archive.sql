drop trigger if exists set_timestamp_archives ON readabilty_archives;
drop index if exists idx_archives_bookmark;
drop index if exists idx_archives_owner;
drop table if exists archives;
