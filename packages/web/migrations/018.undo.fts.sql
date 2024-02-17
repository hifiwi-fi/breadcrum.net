-- Bookmarks FTS down
drop trigger if exists bookmarks_tsv_trigger on bookmarks;
drop function if exists bookmarks_tsv_update();
drop index if exists bookmarks_tsv_idx;
alter table bookmarks drop column if exists tsv;

-- Archives FTS down
drop trigger if exists archives_tsv_trigger on archives;
drop function if exists archives_tsv_update();
drop index if exists archives_tsv_idx;
alter table archives drop column if exists tsv;

-- Episodes FTS down
drop trigger if exists episodes_tsv_trigger on episodes;
drop function if exists episodes_tsv_update();
drop index if exists episodes_tsv_idx;
alter table episodes drop column if exists tsv;

-- Users FTS down
drop trigger if exists users_tsv_trigger on users;
drop function if exists users_tsv_update();
drop index if exists users_tsv_idx;
alter table users drop column if exists tsv;
