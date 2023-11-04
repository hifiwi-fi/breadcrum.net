import { html } from 'uland-isomorphic'
import { dirname } from 'node:path'

/**
 * @template T
 * @typedef {import('@siteup/cli').LayoutFunction<T>} LayoutFunction
 */

/**
 * @typedef {import('./blog-index.layout.js').BlogIndexVars} BlogIndexVars
 */

/**
 * @typedef {BlogIndexVars} AutoBlogIndexVars
 */

import blogIndexLayout from './blog-index.layout.js'

/** @type {LayoutFunction<AutoBlogIndexVars>} */
export default function blogAutoIndexLayout (args) {
  const { children, ...rest } = args

  const folderPages = args.pages.filter(folderPage => {
    const dir = dirname(folderPage.pageInfo.path)
    const path = args.page.path
    return dir === path
  }).sort((a, b) => new Date(b.vars.publishDate) - new Date(a.vars.publishDate))

  const wrappedChildren = html`
    <ul class="blog-index-list">
      ${folderPages.map(p => {
        const publishDate = p.vars.publishDate ? new Date(p.vars.publishDate) : null
        return html`
          <li class="blog-entry h-entry">
            <a class="blog-entry-link u-url u-uid p-name" href="/${p.pageInfo.path}/">${p.vars.title}</a>
            ${
              publishDate
                ? html`<time class="blog-entry-date dt-published" datetime="${publishDate.toISOString()}">
                    ${publishDate.toISOString().split('T')[0]}
                  </time>`
                : null
            }
          </li>`
        })}
    </ul>
    ${typeof children === 'string'
      ? html([children])
      : children /* Support both uhtml and string children. Optional. */
    }
  `

  return blogIndexLayout({ children: wrappedChildren, ...rest })
}
