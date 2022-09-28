/* eslint-env browser */
import { Component, html, useRef, useCallback } from 'uland-isomorphic'
import { textIcon } from '../text-icon/index.js'

export const feedDisplay = Component(({
  feed: f = {},
  feeds = [],
  onEdit = () => {}
} = {}) => {
  const copyButton = useRef()

  const handleCopy = useCallback(async (ev) => {
    const feedUrl = f.feed_url
    try {
      await navigator.clipboard.writeText(feedUrl)
      copyButton.current.innerText = 'Copied'
      console.log('copied feed to clipboard')
    } catch (e) {
      console.error(e)
      copyButton.current.innerText = 'Error'
    }
  }, [copyButton.current])

  const handleSelect = useCallback(async ev => {
    ev.target.select()
  })

  return html`
    <div class="bc-feed-display">

      <div class="bc-feed-info">
        <div class="bc-feed-image">
          <img width="100" height="100" src="${f.image_url}" />
        </div>

        <h1 class="bc-feed-title">
          ${f.title}
        </h1>

        <div class="bc-feed-icon-button-line">
          ${f.default_feed
            ? html`${textIcon({ value: 'Default' })}`
            : null}
          ${f.explicit
            ? html`${textIcon({ value: 'Explicit' })}`
            : null}
          <button onClick=${onEdit}>Edit</button>
        </div>

        <div class='bc-feed-description'>
          ${f?.description?.split('\n\n').map(p => html`<p>${p}</p>`)}
        </div>

        <div class="bc-feed-feed-url-line">
          <img height="32" src="/static/atom.svg" />
          <input
            class="bc-feed-header-select"
            type="text"
            readonly
            onclick=${handleSelect}
            value="${f.feed_url}">
          </input>
          <button ref=${copyButton} onclick=${handleCopy}>Copy</button>
        </div>
        <div class="bc-feed-header-help-text">
          ℹ️ Subscribe to this RSS feed in your favorite podcast client that supports video podcasts. Episodes created with bookmarks end up in this feed.
        </div>
      <div>
    </div>
  `
})
