alter table users
  add column remarkable_token text,
  add column remarkable_folder UUID,
  add column remarkable_meta jsonb;


create type archive_send_target as enum ('remarkable', 'kindle', 'print_queue');
create type archive_send_format as enum ('epub', 'pdf', 'html');

create table archive_sends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  bookmark_id uuid not null,
  archive_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  target archive_send_target not null,
  format archive_send_format,
  meta jsonb not null default '{}',
  ready boolean not null default false,
  error text,

  constraint fk_owner
    foreign key(owner_id)
      references users(id)
      on delete cascade,

  constraint fk_bookmark
    foreign key(bookmark_id)
      references bookmarks(id)
      on delete cascade,

  constraint fk_archive
    foreign key(archive_id)
      references archives(id)
      on delete cascade
);

create index idx_archive_sends_owner ON archive_sends(owner_id);
create index idx_archive_sends_bookmark ON archive_sends(bookmark_id);
create index idx_archive_sends_archive ON archive_sends(archive_id);

create trigger set_timestamp_archive_sends
before update on archive_sends
for each row
execute procedure trigger_set_timestamp();
