alter table bookmarks
  add column archive_urls text[] not null default '{}';
