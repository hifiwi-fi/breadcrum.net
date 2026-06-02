/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { tc } from '../../lib/typed-component.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js'
import { BookmarkQuickAdd } from '../../components/bookmark/bookmark-quick-add.js'
import { mountPage } from '../../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const window = useWindow()
  const online = useOnlineStatus()

  const handleQuickAdd = useCallback((/** @type {string} */ url) => {
    if (!online) return
    if (window) {
      window.location.replace(`/bookmarks/add?url=${encodeURIComponent(url)}`)
    }
  }, [online, window])

  return html`
    <div class="bc-bookmarks-submit-page">
      <div class="bc-bookmarks-submit-content">
        <div class="bc-bookmarks-submit-message">Submit a bookmark</div>
        ${tc(BookmarkQuickAdd, {
          onSubmitUrl: handleQuickAdd,
          showToggle: false,
          showCancel: false,
          disabled: !online,
        })}
      </div>
    </div>
  `
}

mountPage(Page)
