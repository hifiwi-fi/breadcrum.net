/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useCallback, useRef } from 'preact/hooks'
import { bookmarklet } from './bookmarklet.js'
// @ts-ignore - version is a string from bookmarklet package
import { version } from '@breadcrum/bookmarklet/dist/version.js'

/** @type {FunctionComponent} */
const BookmarkletCopyLine = () => {
  const copyButton = useRef(/** @type {HTMLButtonElement | null} */(null))

  const handleSelect = useCallback(async (/** @type {Event} */ ev) => {
    const target = /** @type {HTMLInputElement} */ (ev.target)
    target.select()
  }, [])

  const handleCopy = useCallback(async (/** @type {Event} */ _ev) => {
    try {
      await navigator.clipboard.writeText(bookmarklet)
      if (copyButton.current) {
        copyButton.current.innerText = 'Copied'
      }
      console.log('copied bookmarklet to clipboard')
    } catch (e) {
      console.error(e)
      if (copyButton.current) {
        copyButton.current.innerText = 'Error'
      }
    }
  }, [])

  return html`
    <div>
      <div class="bc-bookmarklet-copy-line">
        <input
          class="bc-bookmarklet-copy-select"
          type="text"
          readonly
          onClick=${handleSelect}
          defaultValue="${bookmarklet}"
        />
        <button ref=${copyButton} onClick=${handleCopy}>Copy</button>
      </div>
      <span class="bc-help-text">Or create a Bookmark and set the URL to the above script.</span>
    </div>
  `
}

/** @type {FunctionComponent} */
export const Page = () => {
  return html`
    <p>
      Drag this bookmarklet to your bookmark bar or menu.
      When you visit a page you want to bookmark, click the bookmarklet in
      your bookmark bar or menu and it will open a new bookmark window. Existing
      URLs will open an edit window.
    </p>

    <div>
      <p>
        <a class="bc-bookmarklet" href="${bookmarklet}">🥖 bookmark</a>
        <a class="bc-help-text" href="${`https://github.com/hifiwi-fi/bc-bookmarklet/releases/tag/v${version}`}">Version ${version}</a>
        <br/>
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

    <${BookmarkletCopyLine} />

    <p>More options:</p>
    <ul>
      <li><a href="/docs/bookmarks/apple-shortcuts/">🍎 Apple Shortcuts</a></li>
      <li><a href="/docs/bookmarks/bookmark-add-page-api/">🔗 Bookmark Add Page API</a></li>
    </ul>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-docs-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
