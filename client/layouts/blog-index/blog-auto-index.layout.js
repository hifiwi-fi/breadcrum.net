/**
 * @import { DataDeps, LayoutFunction } from '@domstack/static/types.js'
 * @import { BlogYearData } from '../../globals/global.data.js'
 * @import { BlogIndexVars } from './blog-index.layout.js'
 * @import { PageReturn } from '../root/root.layout.js'
 */
import { html } from 'htm/preact'

import { render } from 'preact-render-to-string'

import blogIndexLayout from './blog-index.layout.js'

export const vars = {
  dataDeps: /** @satisfies {DataDeps<BlogYearData>} */ (['blogYearPosts']),
}

/** @type {LayoutFunction<BlogIndexVars, PageReturn, string, BlogYearData>} */
export default function blogAutoIndexLayout (args) {
  const { children, ...rest } = args

  const folderPages = args.data.blogYearPosts[args.page.path] ?? []

  const headerContent = html`
    <ul class="blog-index-list">
      ${folderPages.map(p => {
        const publishDate = p.publishDate ? new Date(p.publishDate) : null
        return html`
          <li class="blog-entry h-entry">
            <a class="blog-entry-link u-url u-uid p-name" href="/${p.path}/">${p.title}</a>
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
  `

  const wrappedChildren = typeof children === 'string'
    ? render(headerContent) + children
    : html`
        ${headerContent}
        ${children}
      `

  return blogIndexLayout({ children: wrappedChildren, ...rest })
}
