import { fullArchiveProps } from './archive-props.js'
import { fullBookmarkProps } from '../bookmarks/bookmark-props.js'

export const fullArchivePropsWithBookmark = {
  ...fullArchiveProps,
  bookmark: {
    type: 'object',
    properties: {
      ...fullBookmarkProps
    }
  }
}
