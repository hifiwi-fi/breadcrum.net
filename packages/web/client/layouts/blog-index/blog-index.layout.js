import { html } from 'uland-isomorphic'
import { sep } from 'node:path'
import { breadcrumb } from '../../components/breadcrumb/index.js'

/**
 * @import { LayoutFunction } from '@domstack/static'
 */

/**
 * @typedef {import('../root/root.layout.js').RootLayoutVars} RootLayoutVars
 */

/**
 * @typedef {RootLayoutVars & {
 *  title: string,
 *  publishDate: string,
 *  [key: string]: any
 * }} BlogIndexVars
 */

import defaultRootLayout from '../root/root.layout.js'

/** @type {LayoutFunction<BlogIndexVars>} */
export default function blogIndexLayout (args) {
  const { children, ...rest } = args
  const pathSegments = args.page.path.split(sep)
  const wrappedChildren = html`
    ${breadcrumb({ pathSegments })}
    <h1>${args.vars.title}</h1>
    ${typeof children === 'string'
      ? html([children])
      : children /* Support both uhtml and string children. Optional. */
    }
  `

  // @ts-ignore
  return defaultRootLayout({ children: wrappedChildren, ...rest })
}
