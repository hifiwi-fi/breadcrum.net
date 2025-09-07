/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'

/**
 * Footer component. STATIC. NOT CURRENTLTY CLIENT RENDERED
 * @type {{
  *   version: string,
  *   mastodonUrl: string,
  *   discordUrl: string
 }}
 */

/** @type{FunctionComponent<{
 * version: string,
 * mastodonUrl: string,
 * discordUrl: string
 * siteTwitterUrl: string
 * bskyUrl: string
}>} */
export const Footer = ({
  version,
  mastodonUrl,
  discordUrl,
  siteTwitterUrl,
  bskyUrl,
}) => {
  return html`
  <footer class="bc-footer">
    <div>
      <a href="/docs/">docs</a>
    </div>
    <div>
      <a href="/blog/">blog</a>
    </div>
    <div>
      <a href="https://breadcrum.betteruptime.com">status</a>
    </div>
    <div>
      <a href="/legal/">legal</a>
    </div>
    <div>
      <a href="https://github.com/hifiwi-fi/breadcrum.net/blob/master/LICENSE">
        AGPL-3.0-or-later
      </a>
    </div>
    <div>
      <a href="https://github.com/hifiwi-fi/breadcrum.net/releases/tag/v${version}">
        v${version}
      </a>
    </div>
    <div>
      © <a href="https://hifiwi.fi">HifiWi.fi</a>
    </div>
    <a class="flex-center preserve-icon" href="/feed.xml" aria-label="Subscribe to the RSS feed" title="Subscribe to the RSS feed">
      <img height="16" width="16" src="/static/atom.svg" alt="Atom feed icon" />
    </a>
    <a class="flex-center preserve-icon" href="/feed.json" aria-label="Subscribe to the JSON feed" title="Subscribe to the JSON feed">
      <img class="rounded-icon" height="16" width="16" src="/static/jsonfeed.svg" alt="JSON feed icon" />
    </a>
    <a class="flex-center preserve-icon" href="${siteTwitterUrl}" rel="me" aria-label="Follow us on X" title="Follow us on X">
      <img class="bc-footer-rounded" height="16" width="16" src="/static/twtr.svg" alt="X icon" />
    </a>
    <a class="flex-center preserve-icon" href="${discordUrl}" aria-label="Join us on Discord" title="Join us on Discord">
      <img height="16" width="16" src="/static/discord.svg" alt="Discord icon" />
    </a>
    <a class="flex-center preserve-icon" href="${mastodonUrl}" rel="me" aria-label="Follow us on Mastodon" title="Follow us on Mastodon">
      <img height="16" width="16" src="/static/mastodon.svg" alt="Mastodon icon" />
    </a>
    <a class="flex-center preserve-icon" href="${bskyUrl}" rel="me" aria-label="Follow us on Bsky" title="Follow us on Bsky">
      <img height="16" width="16" src="/static/bsky.svg" alt="Bsky icon" />
    </a>
    <div>🇺🇸</div>
  </footer>
  `
}
