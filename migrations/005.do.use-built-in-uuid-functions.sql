alter table users
  alter column id
    set default gen_random_uuid();

alter table auth_tokens
  alter column jti
    set default gen_random_uuid();

alter table bookmarks
  alter column id
    set default gen_random_uuid();

alter table tags
  alter column id
    set default gen_random_uuid();

alter table podcast_feeds
  alter column id
    set default gen_random_uuid();

alter table episodes
  alter column id
    set default gen_random_uuid();

DROP EXTENSION IF EXISTS "uuid-ossp";
