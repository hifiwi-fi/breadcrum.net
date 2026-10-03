alter table bookmarks
  add column original_url text;

comment on column bookmarks.original_url is 'The original, unnormalized URL of the bookmark.';
