export function getEpisodeUrl ({
  transport,
  host,
  userId,
  feedId,
  userProvidedToken,
  episodeId
}) {
  return `${transport}://${userId}:${userProvidedToken}@${host}/api/feeds/${feedId}/episode/${episodeId}`
}
