/**
 * @import { TypeFeedJoin } from './schemas/schema-feed-join.js'
 */

import { getFeedImageUrl } from './feed-urls.js'

/**
 * Retrieves the title for a feed, providing a default if none is specified.
 *
 * @param {Object} params - The parameters for getting the feed title.
 * @param {string} [params.title] - The provided title of the feed. If not present, a default title is used.
 * @returns {string} The title of the feed or a default title if none is provided.
 */
export function getFeedTitle ({
  title,
}) {
  return title ?? 'breadcrum.net'
}

/**
 * Constructs a description for a feed, providing a default if none is specified.
 *
 * This function generates a description based on whether the feed is marked as default or custom. It also includes
 * a notice about the privacy of feed URLs.
 *
 * @param {Object} params - The parameters for getting the feed description.
 * @param {string} [params.description] - The provided description of the feed. If not present, a default description is used.
 * @param {boolean} params.defaultFeed - Indicates whether the feed is the default feed for the user.
 * @returns {string} The description of the feed or a default description if none is provided.
 */
export function getFeedDescription ({
  description,
  defaultFeed,
}) {
  return description ?? `This is a ${defaultFeed ? 'default' : 'custom'} podcast feed. Customize this description on the feed's home page.
Feed and episode URLs contain a feed secret, so don't share it with anyone you don't want to have access to the entire feed. You can edit this feeds description and title on its feed page.
`
}

/**
 * Enhances a feed object with default values for title, description, and image URL if they are not provided.
 *
 * This function applies default values to a feed object's title, description, and image URL by calling respective
 * functions that generate these defaults if necessary.
 *
 * @param {object} params - The parameters for enhancing the feed with defaults.
 * @param {string} params.transport - The transport protocol (e.g., http, https) to use for constructing the image URL.
 * @param {string} params.host - The host domain to use for constructing the image URL.
 * @param {TypeFeedJoin | undefined } params.feed - The feed object to enhance.
 * @returns {TypeFeedJoin} The feed object enhanced with default values for title, description, and image URL.
 */
export function getFeedWithDefaults ({
  feed,
  transport,
  host,
}) {
  /** @type {TypeFeedJoin} */
  const feedWithDefaults = structuredClone(feed ?? {})

  feedWithDefaults.title = getFeedTitle({ title: feedWithDefaults.title })
  feedWithDefaults.description = getFeedDescription({ description: feedWithDefaults.description, defaultFeed: Boolean(feedWithDefaults.default_feed) })
  feedWithDefaults.image_url = getFeedImageUrl({ imageUrl: feedWithDefaults.image_url, transport, host })

  return feedWithDefaults
}
