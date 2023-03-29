import { fullEpisodeProps } from '../episodes/episode-props.js'
import { fullArchiveProps } from '../archives/archive-props.js'
import { fullBookmarkProps } from './bookmark-props.js'

export const fullBookmarkPropsWithEpisodes = {
  ...fullBookmarkProps,
  episodes: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        ...fullEpisodeProps
      }
    }
  },
  archives: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        ...fullArchiveProps
      }
    }
  }
}
