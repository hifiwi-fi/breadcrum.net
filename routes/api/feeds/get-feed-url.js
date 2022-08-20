export function getFeedUrl ({
  transport,
  host,
  userId,
  token,
  feedId
}) {
  return `${transport}://${userId}:${token}@${host}/api/feeds/${feedId}`
}
