/** @import { PageFunction } from '@domstack/static' */
/** @import { BlogIndexVars } from '../layouts/blog-index/blog-index.layout.js' */
/** @import { PageReturn } from '../layouts/root/root.layout.js' */
import { html } from 'htm/preact'
import { dirname, basename } from 'node:path'

export const vars = {
  title: 'Breadcrum.net Blog',
  layout: 'blog-index',
  noindex: true,
}

/** @type {PageFunction<BlogIndexVars, PageReturn>} */
export default function blogIndex2023 ({
  pages,
  page,
}) {
  const blogPosts = pages
    .filter(page => /** @type {any} */(page.vars).layout === 'article')
    // @ts-ignore
    .sort((a, b) => new Date(b.vars.publishDate) - new Date(a.vars.publishDate))
    .slice(0, 50)

  const folderPages = pages.filter(folderPage => {
    const dir = dirname(folderPage.pageInfo.path)
    const path = page.path
    return dir === path
  })

  return html`
    <ul class="blog-index-list">
      ${blogPosts.map(p => {
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
    <footer class="blog-index-footer">
      <h4>Archive</h4>
      <ul class="archive-list">
        ${folderPages.map(p => {
          return html`<li>
            <a href="/${p.pageInfo.path}/">${basename(p.pageInfo.path)}</a>
          </li>`
        })}
      <ul>
    </footer>
    `
}
