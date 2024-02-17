create type archive_extraction_method as enum ('server', 'client');

create table archives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  bookmark_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  url text not null,
  title text,
  site_name text,
  html_content text,
  text_content text, /* used for full text search maybe */
  length bigint,
  excerpt text,
  byline text,
  direction text,
  language text,
  extraction_method archive_extraction_method not null,
  ready boolean not null default false,
  error text,

  constraint fk_owner
    foreign key(owner_id)
      references users(id)
      on delete cascade,

  constraint fk_bookmark
    foreign key(bookmark_id)
      references bookmarks(id)
      on delete cascade
);

create index idx_archives_owner ON archives(owner_id);
create index idx_archives_bookmark ON archives(bookmark_id);

create trigger set_timestamp_archives
before update on archives
for each row
execute procedure trigger_set_timestamp();


alter table bookmarks
  add column summary text;
