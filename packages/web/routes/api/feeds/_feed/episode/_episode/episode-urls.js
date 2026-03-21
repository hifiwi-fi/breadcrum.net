/**
 * @param {Object} params
 * @param {string} params.transport
 * @param {string} params.host
 * @param {string} params.userId
 * @param {string} params.feedId
 * @param {string} params.token
 * @param {string} params.episodeId
 */
export function getEpisodeUrl ({
  transport,
  host,
  userId,
  feedId,
  token,
  episodeId,
}) {
  return `${transport}://${userId}:${token}@${host}/api/feeds/${feedId}/episode/${episodeId}`
}

/**
 * @param {Object} params
 * @param {string} params.transport
 * @param {string} params.host
 * @param {string} params.episodeId
 */
export function getEpisodePermalinkUrl ({
  transport,
  host,
  episodeId,
}) {
  return `${transport}://${host}/episodes/view/?id=${episodeId}`
}
