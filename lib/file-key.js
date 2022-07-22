export function getFileKey ({
  userId,
  episodeId,
  sourceUrl,
  type,
  medium
}) {
  return [
    'file',
    userId,
    episodeId,
    sourceUrl,
    type,
    medium
  ].join(':')
}
