alter table podcast_feeds
  add column token text not null default encode(gen_random_bytes(32), 'hex');
