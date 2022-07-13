create extension if not exists "uuid-ossp";

alter table users
  alter column id
    set default uuid_generate_v1mc();

alter table auth_tokens
  alter column jti
    drop default;

alter table bookmarks
  alter column id
    set default uuid_generate_v1mc();

alter table tags
  alter column id
    set default uuid_generate_v1mc();

alter table podcast_feeds
  alter column id
    set default uuid_generate_v1mc();

alter table episodes
  alter column id
    set default uuid_generate_v1mc();
