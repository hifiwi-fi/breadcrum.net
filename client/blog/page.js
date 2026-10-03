/** @import { DataDeps } from '@domstack/static/types.js' */
/** @import { SitePage } from '#client/types/site-page.js' */
/** @import { BlogIndexData } from '../globals/global.data.js' */
import { html } from 'htm/preact'
import { basename } from 'node:path'

export const vars = {
  title: 'Breadcrum.net Blog',
  layout: 'blog-index',
  noindex: true,
  dataDeps: /** @satisfies {DataDeps<BlogIndexData>} */ (['blogPosts', 'blogArchives']),
}

/** @type {SitePage<'blog-index', typeof vars, BlogIndexData>} */
export default function blogIndex2023 ({
  data: { blogPosts, blogArchives },
}) {
  return html`
    <ul class="blog-index-list">
      ${blogPosts.map(p => {
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
    <footer class="blog-index-footer">
      <h4>Archive</h4>
      <ul class="archive-list">
        ${blogArchives.map(path => {
          return html`<li>
            <a href="/${path}/">${basename(path)}</a>
          </li>`
        })}
      </ul>
    </footer>
    `
}
