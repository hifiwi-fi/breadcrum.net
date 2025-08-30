/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useCallback, useRef } from 'preact/hooks'
import { bookmarklet } from '../bookmarklets/bookmarklet.js'
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
      When you visit a page you want to bookmark, click the the bookmarklet in
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
    </div>

    <p>
      Alternatively, manually create a new bookmark in your Browser bookmark manager
      and copy/paste the following script into the bookmark URL field.
    </p>

    <${BookmarkletCopyLine} />

    <h2>Apple Shortcut</h2>

    <p>
      This apple shortcut will let you save safari web pages to breadcrum from
      the share sheet. Eventually this will be provided by a native app.
    </p>

    <ul>
      <li>
        <a href="https://www.icloud.com/shortcuts/2067714b7f974298886570256528bf46">Breadcrum iOS shortcut</a>: Create a bookmark and show the edit prompt.
      </li>
      <li>
        <a href="https://www.icloud.com/shortcuts/73f889f9d0d544488e247bc522e524bb">Breadcrum instant iOS shortcut</a>: Create a bookmark without any prompts. Requires an <a href="https://breadcrum.net/openapi/static/index.html#/default/post_api_login_">auth token</a>.
      </li>
    </ul>

    <h2>
      Bookmark Add Page API
    </h2>

    <p>
      The bookmarklet simply opens the <a href="/bookmarks/add">Bookmark Add</a>
      page with a few query params populated by client side metadata extraction.
      This page supports client provided metadata, or an option to request server
      side extracted metadata.
      Here are the relavant query params you can use on this page:
    </p>

    <p>Example:</p>

    <pre>${process.env['TRANSPORT']}://${process.env['HOST']}/bookmarks/add/?url=https://example.com&title=Example Title</pre>

    <ul>
      <li>
        <code>url</code>: (Required) A URL you want to bookmark or edit.
      </li>
      <li>
        <code>title</code>: The title to create a non-existing bookmark with.
      </li>
      <li>
        <code>note</code>: The note to create a non-existing bookmark with.
      </li>
      <li>
        <code>tags</code>: The tags to create a non-existing bookmark with. Append multiple tags query strings to apply more than one tag.
      </li>
      <li>
        <code>meta</code>: Set this param to <code>true</code> to request server extracta metadata.
        Note, any client provided metadata will override the server extracted metadata.
        This option is slightly slower to create a bookmark.
      </li>
      <li>
        <code>jump</code>: Set this param to <code>close</code> to close the window after successful submit.
      </li>
    </ul>

    <p>
      A title is required if <code>meta</code> is set to <code>false</code>.
    </p>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-docs-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
