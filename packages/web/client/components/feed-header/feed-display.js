/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeFeedRead } from '../../../routes/api/feeds/schemas/schema-feed-read.js'
 */

import { html } from 'htm/preact'
import { useRef, useCallback } from 'preact/hooks'
import { TextIcon } from '../text-icon/index.js'

/**
 * @typedef {object} FeedDisplayProps
 * @property {TypeFeedRead} [feed]
 * @property {() => void} [onEdit]
 */

/**
 * @type {FunctionComponent<FeedDisplayProps>}
 */
export const FeedDisplay = ({
  feed: f = {},
  onEdit = () => {},
}) => {
  const copyButtonRef = useRef(/** @type {HTMLButtonElement | null} */(null))

  const handleCopy = useCallback(async () => {
    const feedUrl = f.feed_url
    if (!feedUrl) return
    try {
      await navigator.clipboard.writeText(feedUrl)
      const copyButton = copyButtonRef.current
      if (copyButton) {
        copyButton.innerText = 'Copied'
      }
      console.log('copied feed to clipboard')
    } catch (e) {
      console.error(e)
      const copyButton = copyButtonRef.current
      if (copyButton) {
        copyButton.innerText = 'Error'
      }
    }
  }, [copyButtonRef.current, f.feed_url])

  const handleSelect = useCallback(async (/** @type {Event & {target: HTMLInputElement}} */ev) => {
    ev.target.select()
  }, [])

  return html`
    <div class="bc-feed-display">
      <div class="bc-feed-info">
        <div class="bc-feed-image">
          <img width="100" height="100" src="${f.image_url ?? '/static/bread.png'}" />
        </div>

        <h1 class="bc-feed-title">
          ${f.title ?? 'breadcrum.net'}
        </h1>

        <div class="bc-feed-icon-button-line">
          ${f.default_feed
            ? html`<${TextIcon} value="Default" />`
            : null}
          ${f.explicit
            ? html`<${TextIcon} value="Explicit" />`
            : null}
          <button onClick=${onEdit}>Edit</button>
        </div>

        <div class='bc-feed-description'>
          ${f?.description?.split('\n\n').map(p => html`<p>${p}</p>`)}
        </div>

        <div class="bc-feed-feed-url-line">
          <a href=${`/api/feeds/${f.id}?format=json`}><img width="32" src="/static/atom.svg" /></a>
          <input
            class="bc-feed-header-select"
            type="text"
            readonly
            onClick=${handleSelect}
            defaultValue="${f.feed_url}"
          />
          <button ref=${copyButtonRef} onClick=${handleCopy}>Copy</button>
        </div>
        <div class="bc-help-text bc-feed-header-help-text">
          ℹ️ Subscribe to this RSS feed in your favorite podcast client that supports video podcasts. Episodes created with bookmarks end up in this feed.
        </div>
      </div>
    </div>
  `
}
