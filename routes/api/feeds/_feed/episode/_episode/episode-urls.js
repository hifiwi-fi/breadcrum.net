export function getEpisodeUrl ({
  transport,
  host,
  userId,
  feedId,
  token,
  episodeId
}) {
  return `${transport}://${userId}:${token}@${host}/api/feeds/${feedId}/episode/${episodeId}`
}
