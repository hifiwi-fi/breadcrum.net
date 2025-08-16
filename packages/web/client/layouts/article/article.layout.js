/**
 * @import { LayoutFunction } from '@domstack/static'
 * @import { RootLayoutVars } from '../root/root.layout.js'
 */

import { html } from 'htm/preact'
import { sep } from 'node:path'
import { Breadcrumb } from '../../components/breadcrumb/index.js'
import { ArticleHeader } from '../../components/article-header/index.js'
import { tc } from '../../lib/typed-component.js'

import defaultRootLayout from '../root/root.layout.js'

/**
 * @typedef {{
 * title: string,
 * authorImgUrl?: string,
 * authorImgAlt?: string,
 * authorName?: string,
 * authorUrl?: string,
 * publishDate: string,
 * updatedDate: string
 * }} ArticleLayoutVars
 */

/** @type {LayoutFunction<RootLayoutVars & ArticleLayoutVars>} */
export default function articleLayout (args) {
  const { children, ...rest } = args
  const page = rest.page
  const vars = rest.vars
  const pathSegments = page.path.split(sep)
  const wrappedChildren = html`
    <${Breadcrumb} pathSegments=${pathSegments} />
    <article class="bc-article h-entry" itemscope itemtype="http://schema.org/NewsArticle">
        ${tc(ArticleHeader, {
            title: vars.title,
            authorImgUrl: vars.authorImgUrl,
            authorImgAlt: vars.authorImgAlt,
            authorName: vars.authorName,
            authorUrl: vars.authorUrl,
            publishDate: vars.publishDate,
            updatedDate: vars.updatedDate
        })}

      ${typeof children === 'string'
        ? html`<section class="e-content" itemprop="articleBody" dangerouslySetInnerHTML="${{ __html: children }}" />`
        : html`
            <section class="e-content" itemprop="articleBody">
              ${children}
            </section>`
      }

      <footer class="blog-footer">
        <p>Wan't to follow along for future updates? Follow our <a href="/docs/social/">socials and feeds</a>!</p>
      </footer>
    </article>
    <giscus-widget
      id="comments"
      repo="hifiwi-fi/breadcrum.net"
      repoid="MDEwOlJlcG9zaXRvcnkzMjIwMjk3OTk="
      category="Announcements"
      categoryid="DIC_kwDOEzHI584CN95V"
      mapping="og:title"
      strict="0"
      reactionsenabled="1"
      emitmetadata="0"
      inputposition="top"
      theme="preferred_color_scheme"
      lang="en"
      loading="lazy"
    ></giscus-widget>
    <${Breadcrumb} pathSegments=${pathSegments} />
  `

  return defaultRootLayout({ children: wrappedChildren, .../** @type {any} */(rest) })
}
