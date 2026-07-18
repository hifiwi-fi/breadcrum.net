import { bookmarklet } from './bookmarklet.js'
// @ts-ignore - version is a string from bookmarklet package
import { version } from '@breadcrum/bookmarklet/dist/version.js'

export default {
  title: 'Bookmarklets',
  layout: 'docs',
  bookmarklet,
  version,
}
