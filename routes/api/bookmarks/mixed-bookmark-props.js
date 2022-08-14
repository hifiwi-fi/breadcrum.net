import { fullEpisodeProps } from '../episodes/episode-props.js'
import { fullBookmarkProps } from './bookmark-props.js'

export const fullBookmarkPropsWithEpisodes = {
  ...fullBookmarkProps,
  episodes: {
    type: ['array', 'null'],
    items: {
      type: 'object',
      properties: {
        ...fullEpisodeProps
      }
    }
  }
}
