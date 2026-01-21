/**
 * @import { LayoutFunction } from '@domstack/static'
 * @import { RootLayoutVars, PageReturn } from '../root/root.layout.js'
*/

import { html } from 'htm/preact'
import { sep, relative } from 'node:path'
import { Breadcrumb } from '../../components/breadcrumb/index.js'
import { ArticleHeader } from '../../components/article-header/index.js'
import { tc } from '../../lib/typed-component.js'

import defaultRootLayout from '../root/root.layout.js'

const editText = 'Docs can be edited. Please suggest improvements!'

/**
 * Docs layout variables type - extends RootLayoutVars with docs-specific properties
 * @typedef {RootLayoutVars & {
 *  title: string,
 *  publishDate: string,
 *  updatedDate: string
 * }} DocsLayoutVars
 */

/** @type {LayoutFunction<DocsLayoutVars, PageReturn>} */
export default function articleLayout (args) {
  const { children, ...rest } = args
  const page = rest.page
  const vars = rest.vars
  const pathSegments = page.path.split(sep)
  const rawRelname = page?.pageFile?.filepath
    ? relative(process.cwd(), page.pageFile.filepath).replaceAll(sep, '/')
    : page?.pageFile?.relname?.replaceAll(sep, '/')
  const sourceRelname = rawRelname
    ? rawRelname.startsWith('packages/web/')
      ? rawRelname
      : rawRelname.startsWith('client/')
        ? `packages/web/${rawRelname}`
        : rawRelname
    : null
  const editUrl = sourceRelname
    ? `https://github.com/hifiwi-fi/breadcrum.net/blob/master/${sourceRelname}`
    : null
  const editBlock = editUrl
    ? html`
      <div class="bc-docs-edit-block">
        <span class="bc-help-text">${editText}</span>
        <a class="bc-docs-edit-link" href="${editUrl}" target="_blank" rel="noreferrer">Edit this page</a>
      </div>
    `
    : null
  const editFooterBlock = editUrl
    ? html`
      <footer class="bc-docs-edit-block">
        <span class="bc-help-text">${editText}</span>
        <a class="bc-docs-edit-link" href="${editUrl}" target="_blank" rel="noreferrer">Edit this page</a>
      </footer>
    `
    : null

  const wrappedChildren = html`
    <${Breadcrumb} pathSegments=${pathSegments} />
    <article class="h-entry" itemscope itemtype="http://schema.org/TechArticle">
        ${tc(ArticleHeader, {
            title: vars.title,
            authorImgUrl: null,
            authorImgAlt: null,
            authorName: null,
            authorUrl: null,
            publishDate: vars.publishDate,
            updatedDate: vars.updatedDate,
            extra: editBlock
        })}
      ${typeof children === 'string'
        ? html`<section class="bc-docs-main e-content" itemprop="articleBody" dangerouslySetInnerHTML="${{ __html: children }}"/>`
       : html`<section class="bc-docs-main e-content" itemprop="articleBody">${children}</main>`
       }
      ${editFooterBlock}
    </article>
    <${Breadcrumb} pathSegments=${pathSegments} />
  `

  return defaultRootLayout({ children: wrappedChildren, .../** @type {any} */(rest) })
}
