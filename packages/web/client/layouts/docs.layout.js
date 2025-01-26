import { html } from 'uland-isomorphic'
import { sep } from 'node:path'
import { breadcrumb } from '../components/breadcrumb/index.js'
import { articleHeader } from '../components/article-header/index.js'

import defaultRootLayout from './root.layout.js'

export default function articleLayout (args) {
  const { children, ...rest } = args
  const page = rest.page
  const vars = rest.vars
  const pathSegments = page.path.split(sep)

  const wrappedChildren = html`
    ${breadcrumb({ pathSegments })}
    <article class="h-entry" itemscope itemtype="http://schema.org/TechArticle">
        ${articleHeader({
            title: vars.title,
            authorImgUrl: null,
            authorImgAlt: null,
            authorName: null,
            authorUrl: null,
            publishDate: vars.publishDate,
            updatedDate: vars.updatedDate
        })}

      <section class="bc-docs-main e-content" itemprop="articleBody">
        ${typeof children === 'string'
          ? html([children])
          : children /* Support both uhtml and string children. Optional. */
        }
      </section>
    </article>
    ${breadcrumb({ pathSegments })}
  `

  return defaultRootLayout({ children: wrappedChildren, ...rest })
}
