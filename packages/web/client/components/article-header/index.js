/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'

/**
 * @typedef {object} ArticleHeaderProps
 * @property {string} title
 * @property {string | null | undefined} [authorImgUrl]
 * @property {string | null | undefined} [authorImgAlt]
 * @property {string | null | undefined} [authorName]
 * @property {string | null | undefined} [authorUrl]
 * @property {string} publishDate
 * @property {string} updatedDate
 */

/**
 * @type {FunctionComponent<ArticleHeaderProps>}
 */
export const ArticleHeader = ({
  title,
  authorImgUrl,
  authorImgAlt,
  authorName,
  authorUrl,
  publishDate,
  updatedDate
}) => {
  return html`
      <header class="bc-article-header">
        <h1 class="p-name article-title" itemprop="headline">${title}</h1>
        <div class="metadata">
          ${authorImgUrl && authorName && authorUrl
              ? html`
                  <address class="author-info p-author h-card" itemprop="author" itemscope itemtype="http://schema.org/Person">
                    ${authorImgUrl
                    ? html`<img height="40" width="40"  src="${authorImgUrl}" alt="${authorImgAlt}" class="u-photo" itemprop="image" />`
                      : null
                    }
                    ${authorName && authorUrl
                      ? html`
                          <a href="${authorUrl}" class="u-url" itemprop="url">
                            <span itemprop="p-name name">${authorName}</span>
                          </a>`
                      : null
                    }
                  </address>
                  `
              : null
          }
          ${publishDate
            ? html`
              <time class="date-time dt-published" itemprop="datePublished" datetime="${publishDate}">
                <a href="#" class="u-url">
                  ${(new Date(publishDate)).toLocaleString()}
                </a>
              </time>`
            : null
          }
          ${updatedDate
            ? html`<time class="dt-updated" itemprop="dateModified" datetime="${updatedDate}">Updated ${(new Date(updatedDate)).toLocaleString()}</time>`
            : null
          }
        </div>
      </header>
  `
}
