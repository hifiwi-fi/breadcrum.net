create table podcast_feeds (
  id uuid primary key default uuid_generate_v1mc(),
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  title text check ( char_length(title) > 0 ) check(char_length(title) <= 255),
  description text,
  image_url text,
  explicit boolean not null default false,

  constraint fk_owner
    foreign key(owner_id)
      references users(id)
      on delete cascade
);

create index idx_podcast_feeds_owner on podcast_feeds(owner_id);

create trigger set_timestamp_podcast_feeds
before update on podcast_feeds
for each row
execute procedure trigger_set_timestamp();

alter table users
  add column default_podcast_feed_id uuid,
  add constraint fk_default_podcast_feed
    foreign key(default_podcast_feed_id)
    references podcast_feeds(id);

create type episode_type as enum ('redirect', 'b2_file');
create type episode_medium as enum ('video', 'audio');

create table episodes (
  id uuid primary key default uuid_generate_v1mc(),
  owner_id uuid not null,
  podcast_feed_id uuid not null,
  bookmark_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  url text,
  type episode_type not null,
  medium episode_medium not null,
  size_in_bytes integer,
  duration_in_seconds integer,
  mime_type text,
  explicit boolean not null default false,
  author_name text,
  filename text,
  ext text,
  src_type text,
  ready boolean not null default false,
  error text,

  constraint fk_owner
    foreign key(owner_id)
      references users(id)
      on delete cascade,

  constraint fk_podcast_feed
    foreign key(podcast_feed_id)
      references podcast_feeds(id)
      on delete cascade,

  constraint fk_bookmark
    foreign key(bookmark_id)
      references bookmarks(id)
      on delete cascade
);

create index idx_episodes_owner ON episodes(owner_id);
create index idx_episodes_podcast_feed ON episodes(podcast_feed_id);
create index idx_episodes_bookmark ON episodes(bookmark_id);

create trigger set_timestamp_episodes
before update on episodes
for each row
execute procedure trigger_set_timestamp();
