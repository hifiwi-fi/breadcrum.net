import { fullEpisodeProps } from './episode-props.js'
import { fullBookmarkProps } from '../bookmarks/bookmark-props.js'
import { fullFeedProps } from '../feeds/feed-props.js'

export const fullEpisodePropsWithBookmarkAndFeed = {
  ...fullEpisodeProps,
  bookmark: {
    type: 'object',
    properties: {
      ...fullBookmarkProps,
    },
  },
  podcast_feed: {
    type: 'object',
    properties: {
      ...fullFeedProps,
    },
  },
}
