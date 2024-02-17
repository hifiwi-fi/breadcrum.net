drop trigger if exists set_timestamp_episodes ON episodes;
drop index if exists idx_episodes_bookmark;
drop index if exists idx_episodes_podcast_feed;
drop index if exists idx_episodes_owner;
drop table if exists episodes;
drop type if exists episode_medium;
drop type if exists episode_type;
alter table if exists users
  drop constraint if exists fk_default_podcast_feed,
  drop column if exists default_podcast_feed_id;
drop trigger if exists set_timestamp_podcast_feeds ON podcast_feeds;
drop index if exists idx_podcast_feeds_owner;
drop table if exists podcast_feeds;
