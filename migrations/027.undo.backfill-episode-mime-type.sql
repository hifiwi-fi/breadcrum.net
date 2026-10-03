update episodes
set mime_type = null
where mime_type in (
  'audio/mpeg',
  'audio/mp4',
  'video/mp4',
  'video/quicktime',
  'application/vnd.apple.mpegurl'
);
