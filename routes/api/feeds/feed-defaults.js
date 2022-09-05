export function getFeedTitle ({
  title,
  ownerName
}) {
  return title || `${ownerName}'s breadcrum feed`
}

export function getFeedDescription ({
  description,
  ownerName,
  defaultFeed
}) {
  return description ?? `This is ${ownerName}'s ${defaultFeed ? 'default' : 'custom'} podcast feed. Customize this description on the feed's home page.

Remember, feed URLs and episode contain a feed secret, so don't share it with anyone you don't want to have access to the entire feed.

If you want to share a feed with a friend or family member, consider creating a new feed and sharing that.
`
}
