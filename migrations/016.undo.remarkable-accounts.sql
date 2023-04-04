drop trigger if exists set_timestamp_archive_sends ON archive_sends;
drop index if exists idx_archive_sends_archive;
drop index if exists idx_archive_sends_bookmark;
drop index if exists idx_archive_sends_owner;
drop table if exists archive_sends;
drop type if exists archive_send_format;
drop type if exists archive_send_target;

alter table users
  drop column if exists remarkable_meta,
  drop column if exists remarkable_folder,
  drop column if exists remarkable_token;
