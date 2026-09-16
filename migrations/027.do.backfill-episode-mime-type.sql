update episodes
set mime_type = case
  when ext = 'mp3' then 'audio/mpeg'
  when ext = 'm4a' then 'audio/mp4'
  when ext = 'mp4' then 'video/mp4'
  when ext = 'mov' then 'video/quicktime'
  when ext = 'm3u8' then 'application/vnd.apple.mpegurl'
  else mime_type
end
where mime_type is null
and ext is not null;
