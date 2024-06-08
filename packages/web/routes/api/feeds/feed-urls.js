export function getFeedUrl ({
  transport,
  host,
  userId,
  token,
  feedId,
}) {
  return `${transport}://${userId}:${token}@${host}/api/feeds/${feedId}`
}

export function getFeedHtmlUrl ({
  transport,
  host,
  feedId,
}) {
  return `${transport}://${host}/feeds?id=${feedId}`
}

export function getFeedImageUrl ({
  imageUrl,
  transport,
  host,
}) {
  return imageUrl ?? `${transport}://${host}/static/bread.png`
}
