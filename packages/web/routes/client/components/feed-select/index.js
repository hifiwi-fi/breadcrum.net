/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeFeedRead } from '../../../api/feeds/schemas/schema-feed-read.js'
 */

import { html } from 'htm/preact'

/**
 * @typedef {object} FeedSelectProps
 * @property {TypeFeedRead[]} feeds
 * @property {string} [selectedFeedId]
 * @property {(feedId: string) => void} [onFeedChange]
 */

/**
 * @type {FunctionComponent<FeedSelectProps>}
 */
export const FeedSelect = ({
  feeds,
  selectedFeedId,
  onFeedChange,
}) => {
  const handleChange = (/** @type {Event & {currentTarget: HTMLSelectElement}} */ev) => {
    if (onFeedChange) {
      onFeedChange(ev.currentTarget.value)
    }
  }

  return html`
    <form class="bc-feed-select-form">
      <label for="feed-select">Select Feed:</label>
      <select id="feed-select" defaultValue="${selectedFeedId}" onChange="${handleChange}">
        ${feeds.map(f => html`
          <option key="${f.id}" defaultValue="${f.id}">${f.title}</option>
        `)}
      </select>
    </form>
  `
}
