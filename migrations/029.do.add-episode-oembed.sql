alter table episodes
  add column oembed jsonb,
  add column published_time timestamptz;

comment on column episodes.oembed is 'oEmbed data for the episode. Discriminated by oembed.kind: "template" stores metadata only (html generated at API response time), "fetched" stores full oEmbed payload including html.';
comment on column episodes.published_time is 'Original publish/release time of the media, sourced from yt-dlp release_timestamp.';
