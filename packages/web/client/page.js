/** @import { PageFunction } from '@domstack/static' */
/** @import { RootLayoutVars, PageReturn } from './layouts/root/root.layout.js' */
import { page } from './client.js'

/** @type {PageFunction<RootLayoutVars, PageReturn>} */
export default () => {
  return page()
}
