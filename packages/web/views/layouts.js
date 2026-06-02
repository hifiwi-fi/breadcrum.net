/**
 * @import { FragtmlLayoutMap } from 'fastify-fragtml'
 * @import { HtmlTag } from 'fragtml/types.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from './context.js'
 */

import html from 'fragtml'
import { header } from './components/header.js'
import { footer } from './components/footer.js'

/**
 * @type {FragtmlLayoutMap<ViewContext, AppLayoutName, AppFragmentId>}
 */
export const layouts = {
  root: {
    contentType: 'text/html; charset=utf-8',
    render: (body, context, options) => {
      const h = /** @type {HtmlTag<AppFragmentId>} */ (html)(options.fragmentId)
      const title = context.title
        ? `${context.title} | ${context.siteName}`
        : context.siteName
      const description = context.description ?? context.siteDescription
      const canonicalUrl = canonicalUrlForContext(context)
      const imageUrl = context.image ? absoluteUrl(context.image, context.baseUrl) : null

      return h/* html */`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">
            <meta name="referrer" content="no-referrer">
            <meta name="description" content="${description}">
            ${context.noindex ? h`<meta name="robots" content="noindex,nofollow">` : null}
            <link rel="canonical" href="${canonicalUrl}">
            <meta property="og:site_name" content="${context.siteName}">
            <meta property="og:title" content="${context.title ?? context.siteName}">
            <meta property="og:url" content="${canonicalUrl}">
            <meta property="og:description" content="${description}">
            <meta name="twitter:title" content="${context.title ?? context.siteName}">
            <meta name="twitter:description" content="${description}">
            <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">
            ${imageUrl ? h`<meta property="og:image" content="${imageUrl}">` : null}
            ${imageUrl ? h`<meta name="twitter:image" content="${imageUrl}">` : null}
            ${context.imageAlt ? h`<meta property="og:image:alt" content="${context.imageAlt}">` : null}
            <link rel="alternate" title="${context.siteName} Blog (JSON Feed)" type="application/json" href="/feed.json">
            <link rel="alternate" title="${context.siteName} Blog (JSON Feed)" type="application/feed+json" href="/feed.json">
            <link rel="alternate" title="${context.siteName} Blog (Atom Feed)" type="application/atom+xml" href="/feed.xml">
            <link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="${context.siteName}">
            <link rel="manifest" href="/manifest.webmanifest">
            <meta name="theme-color" content="${context.themeColorLight}" media="(prefers-color-scheme: light)">
            <meta name="theme-color" content="${context.themeColorDark}" media="(prefers-color-scheme: dark)">
            <link rel="shortcut icon" href="/static/bread-transformed.png">
            <link rel="stylesheet" href="/assets/app.css">
            <script defer src="/assets/htmx.min.js"></script>
            <script type="module" src="/assets/giscus.mjs"></script>
            <script type="module" src="/assets/app.js"></script>
          </head>
          <body class="bc-body" hx-boost="true" hx-target="#bc-main" hx-swap="innerHTML" hx-push-url="true">
            <div class="bc-page-container">
              ${header(context)}
              <main id="bc-main" class="bc-main" tabindex="-1" hx-history-elt>
                ${h.fragment.start('main')}
                ${body}
                ${h.fragment.end}
              </main>
              ${footer(context)}
            </div>
          </body>
        </html>
      `
    },
  },
}

/**
 * @param {ViewContext} context
 * @returns {string}
 */
function canonicalUrlForContext (context) {
  const url = new URL(context.currentPath || '/', context.baseUrl)
  url.search = ''
  url.hash = ''
  return url.href
}

/**
 * @param {string} value
 * @param {string} baseUrl
 * @returns {string}
 */
function absoluteUrl (value, baseUrl) {
  return new URL(value, baseUrl).href
}
