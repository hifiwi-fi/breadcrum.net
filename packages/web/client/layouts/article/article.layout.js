import { html } from 'uland-isomorphic'
import { sep } from 'node:path'
import { breadcrumb } from '../../components/breadcrumb/index.js'
import { articleHeader } from '../../components/article-header/index.js'

import defaultRootLayout from '../root/root.layout.js'

export default function articleLayout (args) {
  const { children, ...rest } = args
  const page = rest.page
  const vars = rest.vars
  const pathSegments = page.path.split(sep)
  const wrappedChildren = html`
    ${breadcrumb({ pathSegments })}
    <article class="bc-article h-entry" itemscope itemtype="http://schema.org/NewsArticle">
        ${articleHeader({
            title: vars.title,
            authorImgUrl: vars.authorImgUrl,
            authorImgAlt: vars.authorImgAlt,
            authorName: vars.authorName,
            authorUrl: vars.authorUrl,
            publishDate: vars.publishDate,
            updatedDate: vars.updatedDate
        })}

      <section class="e-content" itemprop="articleBody">
        ${typeof children === 'string'
          ? html([children])
          : children /* Support both uhtml and string children. Optional. */
        }
      </section>

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
    ${breadcrumb({ pathSegments })}
  `

  return defaultRootLayout({ children: wrappedChildren, ...rest })
}
