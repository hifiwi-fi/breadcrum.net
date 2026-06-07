/**
 * @import { FastifyRequest } from 'fastify'
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { RenderedMarkdownPage } from '../content/markdown.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { loadMarkdownPage, markdownFilePath } from '../content/markdown.js'
import { contentSegmentsFromRequest, routePathFromSegments } from '../content/route-utils.js'
import { articleHeader, breadcrumb, docsEditBlock, markdownContent } from '../content/view-components.js'
import { createBookmarkletDocsData } from './bookmarklet.js'

/**
 * @typedef {object} DocsPageState
 * @property {'markdown' | 'bookmarklet' | 'tutorial' | 'notFound'} kind
 * @property {string[]} pathSegments
 * @property {string} [bookmarklet]
 * @property {string} [version]
 */

/**
 * @typedef {object} DocsPageData
 * @property {ViewContext} context
 * @property {RenderedMarkdownPage | null} contentPage
 * @property {DocsPageState} docsPage
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<DocsPageData | undefined>}
 */
export async function load ({ request, reply }) {
  if (!request || !reply) throw new Error('Docs page requires a Fastify request')

  const { segments, redirectPath } = contentSegmentsFromRequest(request, '/docs')
  if (redirectPath) {
    reply.redirect(redirectPath, 301)
    return
  }

  if (segments.length === 1 && segments[0] === 'bookmarklets') {
    reply.redirect('/docs/bookmarks/bookmarklets/', 301)
    return
  }

  const context = await createRouteViewContext(request.server, request, {
    title: 'Docs',
  })
  const pathSegments = ['docs', ...segments]

  if (segments.length === 1 && segments[0] === 'tutorial') {
    return {
      context: {
        ...context,
        title: 'Tutorial',
      },
      contentPage: null,
      docsPage: {
        kind: 'tutorial',
        pathSegments,
        bookmarklet: createBookmarkletData(request).bookmarklet,
      },
    }
  }

  if (segments.length === 2 && segments[0] === 'bookmarks' && segments[1] === 'bookmarklets') {
    return {
      context: {
        ...context,
        title: 'Bookmarklets',
      },
      contentPage: null,
      docsPage: {
        kind: 'bookmarklet',
        pathSegments,
        ...createBookmarkletData(request),
      },
    }
  }

  const routePath = routePathFromSegments('/docs', segments)
  const page = await loadMarkdownPage({
    filePath: markdownFilePath('docs', segments),
    routePath,
    context,
  })

  if (!page) {
    reply.status(404)
    return {
      context: {
        ...context,
        title: 'Docs not found',
      },
      contentPage: null,
      docsPage: {
        kind: 'notFound',
        pathSegments,
      },
    }
  }

  return {
    context: {
      ...context,
      title: page.title,
      description: page.description ?? context.siteDescription,
      ...(page.image ? { image: page.image } : {}),
      noindex: page.noindex,
    },
    contentPage: page,
    docsPage: {
      kind: 'markdown',
      pathSegments,
    },
  }
}

/**
 * @param {{ data: DocsPageData }} ctx
 * @returns {HtmlRenderable}
 */
export default function docsPage ({ data }) {
  switch (data.docsPage.kind) {
    case 'bookmarklet':
      return docsBookmarkletPage(data)
    case 'tutorial':
      return docsTutorialPage(data)
    case 'notFound':
      return docsNotFoundPage(data)
    case 'markdown':
    default:
      return docsMarkdownPage(data)
  }
}

/**
 * @param {Record<string, any>} options
 * @returns {Record<string, any>}
 */
export function routeOptions (options) {
  return {
    ...options,
    schema: contentRouteSchema(),
  }
}

/**
 * @param {DocsPageData} data
 * @returns {HtmlRenderable}
 */
function docsMarkdownPage (data) {
  if (!data.contentPage) return docsNotFoundPage(data)

  return html/* html */`
    <div class="bc-content-page bc-docs-page">
      ${breadcrumb(data.docsPage.pathSegments)}
      <article class="h-entry" itemscope itemtype="http://schema.org/TechArticle">
        ${articleHeader({
          title: data.contentPage.title,
          publishDate: data.contentPage.publishDate,
          updatedDate: data.contentPage.updatedDate,
          extra: docsEditBlock(data.contentPage),
        })}
        ${markdownContent(data.contentPage, 'bc-docs-main bc-content-body')}
        <footer>
          ${docsEditBlock(data.contentPage)}
        </footer>
      </article>
      ${breadcrumb(data.docsPage.pathSegments)}
    </div>
  `
}

/**
 * @param {DocsPageData} data
 * @returns {HtmlRenderable}
 */
function docsBookmarkletPage (data) {
  const bookmarklet = data.docsPage.bookmarklet ?? ''
  const version = data.docsPage.version ?? ''

  return html/* html */`
    <div class="bc-content-page bc-docs-page">
      ${breadcrumb(data.docsPage.pathSegments)}
      <article class="h-entry" itemscope itemtype="http://schema.org/TechArticle">
        ${articleHeader({ title: 'Bookmarklets' })}
        <section class="bc-docs-main bc-content-body e-content" itemprop="articleBody">
          <p>
            Drag this bookmarklet to your bookmark bar or menu.
            When you visit a page you want to bookmark, click the bookmarklet in
            your bookmark bar or menu and it will open a new bookmark window. Existing
            URLs will open an edit window.
          </p>

          <div>
            <p>
              <a class="bc-bookmarklet" href="${bookmarklet}">🥖 bookmark</a>
              <a class="bc-help-text" href="https://github.com/hifiwi-fi/bc-bookmarklet/releases/tag/v${version}">Version ${version}</a>
              <br>
              <span class="bc-help-text">Drag me to your bookmarks!</span>
            </p>
            <p>
              The bookmarklet window shows its version at the bottom. When a newer version is
              available, you will see a small update link. To update, remove the old bookmarklet
              and add the new one. Updates are infrequent, but please update when you see the link
              to ensure you have the latest features and compatibility fixes.
            </p>
          </div>

          <p>
            Alternatively, manually create a new bookmark in your Browser bookmark manager
            and copy/paste the following script into the bookmark URL field.
          </p>

          <div>
            <div class="bc-bookmarklet-copy-line">
              <input
                class="bc-bookmarklet-copy-select"
                type="text"
                readonly
                aria-label="Bookmarklet script"
                value="${bookmarklet}"
                data-bc-copy-select
              >
              <button type="button" data-bc-copy-text="${bookmarklet}">Copy</button>
            </div>
            <span class="bc-help-text">Or create a Bookmark and set the URL to the above script.</span>
          </div>

          <p>More options:</p>
          <ul>
            <li><a href="/docs/bookmarks/apple-shortcuts/">🍎 Apple Shortcuts</a></li>
            <li><a href="/docs/bookmarks/bookmark-add-page-api/">🔗 Bookmark Add Page API</a></li>
          </ul>
        </section>
      </article>
      ${breadcrumb(data.docsPage.pathSegments)}
    </div>
  `
}

/**
 * @param {DocsPageData} data
 * @returns {HtmlRenderable}
 */
function docsTutorialPage (data) {
  const bookmarklet = data.docsPage.bookmarklet ?? ''

  return html/* html */`
    <div class="bc-content-page bc-docs-page">
      ${breadcrumb(data.docsPage.pathSegments)}
      <article class="h-entry" itemscope itemtype="http://schema.org/TechArticle">
        ${articleHeader({ title: 'Tutorial' })}
        <section class="bc-docs-main bc-content-body e-content" itemprop="articleBody">
          <p>
            Welcome to 🥖 Breadcrum! Many things are still WIP but the following quick tutorial should get you up to speed.
            For more detail, see the <a href="/docs/">docs index</a>.
          </p>

          <h2>Step 1: Get the Bookmarklet</h2>
          <p>
            Everything you do on Breadcrum starts by adding a 🔖 Bookmark to your account.
            Creating bookmarks should be quick and painless.
            Until native app share sheets and WebExtensions are available for Breadcrum, the Bookmarklet is the best way to do this.
            Learn more in <a href="/docs/bookmarks/bookmarklets/">Bookmarklets</a>.
            iOS users can use <a href="/docs/bookmarks/apple-shortcuts/">Apple Shortcuts</a>,
            and advanced users can prefill bookmarks via the <a href="/docs/bookmarks/bookmark-add-page-api/">Bookmark Add Page API</a>.
          </p>
          <p>
            Drag the following link to your browsers bookmark toolbar or sidebar.
            You can keep the bookmarklet wherever you like, but you should keep it somewhere handy for quick access.
          </p>
          <p><a class="bc-bookmarklet" href="${bookmarklet}">🥖 bookmark</a></p>
          <p>This can be done in a number of different ways. Here are some examples</p>

          <figure>
            <img src="/content/docs/tutorial/img/sidebar-safari.png" alt="Dragging bookmarklet to the safari sidebar">
            <figcaption>Use <kbd>cmd</kbd><kbd>shift</kbd><kbd>L</kbd> to show the Safari sidebar and drag the bookmarklet to the bookmark menu or favorite bar folder.</figcaption>
          </figure>
          <figure>
            <img src="/content/docs/tutorial/img/bookmark-bar-safari.png" alt="Dragging bookmarklet to the safari bookmark bar">
            <figcaption>Use <kbd>cmd</kbd><kbd>shift</kbd><kbd>B</kbd> to show the bookmark bar and drag the bookmarklet to the bookmark bar in safari. Use a similar procedure in other browsers.</figcaption>
          </figure>
          <figure>
            <img src="/content/docs/tutorial/img/ios-safari.jpg" alt="Dragging bookmarklet to the iOS safari bookmark button">
            <figcaption>On iOS, drag the bookmarklet to the bookmark button until the bookmark menu opens up. Place it anywhere you like.</figcaption>
          </figure>

          <p>Add the bookmarklet to all browsers you plan on using Breadcrum with. Using a cloud sync between devices can save you some extra work of adding it on more than one device.</p>

          <h2>Step 2: Bookmark a Website</h2>
          <p>When on a website, click on the bookmarklet that you added to your browser bookmarks. This will open the add bookmark window.</p>
          <figure class="borderless">
            <img src="/content/docs/tutorial/img/add-bookmark.png" alt="Create bookmark window">
            <figcaption>This window lets you create a new bookmark. You can add tags, a note, related archival links and even create podcast episodes from media found in the page.</figcaption>
          </figure>
          <p>
            Fill in the details and click <code>Submit</code>.
            See <a href="/docs/bookmarks/">Bookmarks</a> for lifecycle details, flags, and archive/episode options.
          </p>

          <h2>Step 2: View your 🔖 Bookmarks</h2>
          <p>
            Visit <a href="/bookmarks/">🔖 Bookmarks</a> to view your bookmarks.
            You can also explore <a href="/docs/bookmarks/starred/">Starred</a>,
            <a href="/docs/bookmarks/toread/">Read it later</a>, and
            <a href="/docs/bookmarks/private/">Private (Sensitive)</a>.
          </p>
          <figure class="borderless">
            <picture>
              <source srcset="/static/screenshots/bookmark-window-dark.png" media="(prefers-color-scheme: dark)">
              <img src="/static/screenshots/bookmark-window-light.png" alt="Screenshot of Breadcrum.net">
            </picture>
            <figcaption>This window lets you create a new bookmark. You can add tags, a note, related archival links and even create podcast episodes from media found in the page.</figcaption>
          </figure>

          <h2>Step 3: Subscribe to your 📡 Feed</h2>
          <p>
            Visit <a href="/feeds/">📡 Feeds</a> to get your private Breadcrum podcast feed URL.
            Episodes are built from bookmarks, so it helps to skim <a href="/docs/episodes/">Episodes</a> and
            <a href="/docs/archives/">Archives</a>.
          </p>
          <figure class="borderless">
            <picture>
              <source srcset="/content/docs/tutorial/img/feed-dark.png" media="(prefers-color-scheme: dark)">
              <img src="/content/docs/tutorial/img/feed-light.png" alt="Screenshot of Breadcrum.net feed page">
            </picture>
            <figcaption>On the feed page, get your private podcast feed URL to subscribe to in a podcast app. Don't share this URL! It has a private token that makes it so only you can see the feed.</figcaption>
          </figure>
          <p>Paste the feed URL into your favorite podcast app that preferably supports video podcasts.</p>
          <figure>
            <img src="/content/docs/tutorial/img/follow-show-by-url-apple-podcasts.png" alt="Use Follow show by URL in apple podcasts">
            <figcaption>Follow the show in Apple Podcasts by going to the file Menu and selecting "Follow a Show by URL...".</figcaption>
          </figure>
          <p>After a moment, your feed will refresh and download any content that you capture when creating bookmarks.</p>
          <figure class="borderless">
            <img src="/content/docs/tutorial/img/apple-podcasts.png" alt="View your content in a podcast app">
            <figcaption>All media from around the web, ready for you as a podcast.</figcaption>
          </figure>

          <h2>Step 4: Play around!</h2>
          <p>
            Breadcrum has many features that will be documented soon. Follow <a href="https://x.com/breadcrum_">@breadcrum_</a> for updates as they are available.
            Manage login and security from <a href="/docs/account/">Account settings</a>.
          </p>
        </section>
      </article>
      ${breadcrumb(data.docsPage.pathSegments)}
    </div>
  `
}

/**
 * @param {DocsPageData} data
 * @returns {HtmlRenderable}
 */
function docsNotFoundPage (data) {
  return html/* html */`
    <div class="bc-content-page bc-docs-page">
      ${breadcrumb(data.docsPage.pathSegments)}
      <article>
        <h1>Docs not found</h1>
        <p>The requested docs page could not be found.</p>
      </article>
    </div>
  `
}

/**
 * @param {FastifyRequest} request
 * @returns {{ bookmarklet: string, version: string }}
 */
function createBookmarkletData (request) {
  return createBookmarkletDocsData({
    transport: request.server.config.TRANSPORT,
    host: request.server.config.HOST,
  })
}

/**
 * @returns {object}
 */
function contentRouteSchema () {
  return {
    tags: ['html'],
    response: {
      200: {
        type: 'string',
        contentMediaType: 'text/html',
      },
      301: {
        type: 'string',
      },
      404: {
        type: 'string',
        contentMediaType: 'text/html',
      },
    },
  }
}
