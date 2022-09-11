import { getFeedImageUrl } from './feed-urls.js'

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
Feed and episode URLs contain a feed secret, so don't share it with anyone you don't want to have access to the entire feed. You can edit this feeds description and title on its feed page.
`
}

export function getFeedWithDefaults ({
  feed,
  ownerName,
  ownerId,
  transport,
  host
}) {
  const feedWithDefaults = { ...feed }

  feedWithDefaults.title = getFeedTitle({ ownerName, title: feedWithDefaults.title })
  feedWithDefaults.description = getFeedDescription({ description: feedWithDefaults.description, ownerName, defaultFeed: feedWithDefaults.default_feed })
  feedWithDefaults.image_url = getFeedImageUrl({ imageUrl: feedWithDefaults.image_url, transport, host })

  return feedWithDefaults
}
