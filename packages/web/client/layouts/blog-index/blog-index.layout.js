/**
 * @import { LayoutFunction } from '@domstack/static'
 * @import { RootLayoutVars } from '../root/root.layout.js'
 */

import { html } from 'htm/preact'
import { sep } from 'node:path'
import { render } from 'preact-render-to-string'
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

  const headerContent = html`
     <${Breadcrumb} pathSegments=${pathSegments} />
     <h1>${args.vars.title}</h1>
   `

  const wrappedChildren = typeof children === 'string'
    ? render(headerContent) + children
    : html`
        ${headerContent}
        ${children}
      `

  return defaultRootLayout({ children: wrappedChildren, .../** @type {any} */(rest) })
}
