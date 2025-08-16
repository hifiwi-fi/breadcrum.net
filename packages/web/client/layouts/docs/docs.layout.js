/**
 * @import { LayoutFunction } from '@domstack/static'
 * @import { RootLayoutVars } from '../root/root.layout.js'
*/

import { html } from 'htm/preact'
import { sep } from 'node:path'
import { Breadcrumb } from '../../components/breadcrumb/index.js'
import { ArticleHeader } from '../../components/article-header/index.js'
import { typedComponent } from '../../lib/typed-component.js'

import defaultRootLayout from '../root/root.layout.js'

/**
 * @typedef {{
 * publishDate: string,
 * updatedDate: string
 }} DocsLayoutVars
 */

/** @type {LayoutFunction<RootLayoutVars & DocsLayoutVars>} */
export default function articleLayout (args) {
  const { children, ...rest } = args
  const page = rest.page
  const vars = rest.vars
  const pathSegments = page.path.split(sep)

  const wrappedChildren = html`
    <${Breadcrumb} pathSegments=${pathSegments} />
    <article class="h-entry" itemscope itemtype="http://schema.org/TechArticle">
        ${typedComponent(ArticleHeader, {
            title: vars.title,
            authorImgUrl: null,
            authorImgAlt: null,
            authorName: null,
            authorUrl: null,
            publishDate: vars.publishDate,
            updatedDate: vars.updatedDate
        })}
      ${typeof children === 'string'
        ? html`<section class="bc-docs-main e-content" itemprop="articleBody" dangerouslySetInnerHTML="${{ __html: children }}"/>`
       : html`<section class="bc-docs-main e-content" itemprop="articleBody">${children}</main>`
       }
    </article>
    <${Breadcrumb} pathSegments=${pathSegments} />
  `

  return defaultRootLayout({ children: wrappedChildren, .../** @type {any} */(rest) })
}
