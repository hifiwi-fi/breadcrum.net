/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useCallback } from 'preact/hooks'
import { tc } from '../../lib/typed-component.js'
import { useWindow } from '../../hooks/useWindow.js'
import { BookmarkQuickAdd } from '../../components/bookmark/bookmark-quick-add.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const window = useWindow()

  const handleQuickAdd = useCallback((/** @type {string} */ url) => {
    if (window) {
      window.location.replace(`/bookmarks/add?url=${encodeURIComponent(url)}`)
    }
  }, [window])

  return html`
    <div class="bc-bookmarks-submit-page">
      <div class="bc-bookmarks-submit-content">
        <div class="bc-bookmarks-submit-message">Submit a bookmark</div>
        ${tc(BookmarkQuickAdd, {
          onSubmitUrl: handleQuickAdd,
          showToggle: false,
          showCancel: false,
        })}
      </div>
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
