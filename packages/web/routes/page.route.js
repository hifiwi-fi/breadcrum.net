/**
 * @import { RoutePageContext } from '@domstack/fastify'
 */

import html from 'fragtml'
import { createRouteViewContext } from '#views/context.js'

/**
 * @param {RoutePageContext} ctx
 */
export async function load ({ request }) {
  return {
    context: await createRouteViewContext(request.server, request, {
      title: 'Home',
    }),
  }
}

export default function homePage () {
  return html/* html */`
    <div class="bc-marketing">
      <div class="bc-marketing-hero">
        <div class="bc-marketing-hero-icon">
          <img src="/static/bread.png" alt="">
        </div>
        <h1 class="bc-marking-hero-title">Breadcrum</h1>
        <p class="bc-marking-hero-description">
          Breadcrum is a bookmarking service for collecting your links and articles with media super powers.
          Podcast anything.
        </p>
        <div class="bc-marketing-actions">
          <a class="bc-button bc-button-primary" href="/register/">Early Access</a>
          <a class="bc-button" href="/docs/">Docs</a>
        </div>
        <div class="bc-marketing-hero-screenshot">
          <picture>
            <source srcset="/static/screenshots/bookmark-window-dark.png" media="(prefers-color-scheme: dark)">
            <img src="/static/screenshots/bookmark-window-light.png" alt="Screenshot of Breadcrum.net">
          </picture>
        </div>
      </div>

      <div class="bc-marketing-feature-grid">
        <section class="bc-marketing-feature-block">
          <h2>Bookmark everything</h2>
          <p>
            Collect good links and keep track of what you find on the web across devices and browsers.
          </p>
          <div class="bc-marketing-feature-screenshot">
            <picture>
              <source srcset="/static/screenshots/bookmark-edit-dark.png" media="(prefers-color-scheme: dark)">
              <img src="/static/screenshots/bookmark-edit-light.png" alt="Screenshot of editing a Breadcrum bookmark">
            </picture>
          </div>
        </section>

        <section class="bc-marketing-feature-block">
          <h2>Podcast anything</h2>
          <p>
            Forward video and audio you find on the web into a private podcast feed for the podcast app you already use.
          </p>
          <div class="bc-marketing-feature-screenshot">
            <picture>
              <source srcset="/static/screenshots/apple-podcasts-dark.png" media="(prefers-color-scheme: dark)">
              <img src="/static/screenshots/apple-podcasts-light.png" alt="Screenshot of Breadcrum episodes in Apple Podcasts">
            </picture>
          </div>
        </section>

        <section class="bc-marketing-feature-block">
          <h2>Readability archive</h2>
          <p>
            Privately archive readable article content alongside bookmarks, notes, and tags.
          </p>
        </section>

        <section class="bc-marketing-feature-block">
          <h2>Full text search</h2>
          <p>
            Find old bookmarks, archives, and episodes by phrase or word.
          </p>
        </section>
      </div>
    </div>
  `
}
