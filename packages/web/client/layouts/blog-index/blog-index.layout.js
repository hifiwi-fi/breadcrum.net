/**
 * @import { LayoutFunction } from '@domstack/static'
 * @import { RootLayoutVars } from '../root/root.layout.js'
 */

import { html } from 'htm/preact'
import { sep } from 'node:path'
import { Breadcrumb } from '../../components/breadcrumb/index.js'

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
    ${Breadcrumb({ pathSegments })}
    <h1>${args.vars.title}</h1>
    ${typeof children === 'string'
      ? html(Object.assign([children], { raw: [children] }))
      : children
    }
  `

  return defaultRootLayout({ children: wrappedChildren, .../** @type {any} */(rest) })
}
