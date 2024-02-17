import { Component, html } from 'uland-isomorphic'

/**
 * Footer component. STATIC. NOT CURRENTLTY CLIENT RENDERED
 */
export const footer = Component(({
  version,
  mastodonUrl
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
      <a href="/docs/social/">@breadcrum</a>
    </div>
    <div>
      <a href="https://breadcrum.betteruptime.com">status</a>
    </div>
    <div>
      © <a href="https://hifiwi.fi">HifiWi.fi</a>
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
    <a class="flex-center preserve-icon" href="/feed.xml"><img height="16" width="16" src="/static/atom.svg"></a>
    <a class="flex-center preserve-icon" href="/feed.json"><img class="rounded-icon" height="16" width="16" src="/static/jsonfeed.svg"></a>
    <a class="flex-center preserve-icon" href="${mastodonUrl}" rel="me"><img height="16" width="16" src="/static/mastodon.svg"></a>
  </footer>
  `
})
