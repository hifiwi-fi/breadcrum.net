/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */
import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'

import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useQuery } from '../../hooks/useQuery.js'
import { Sensitive } from '../sensitive/index.js'
import { ToRead } from '../toread/index.js'
import { Star } from '../star/index.js'
import { LoginButtons } from './login-buttons.js'

/** @type{FunctionComponent<{}>} */
export const Header = () => {
  const { user } = useUser({ required: false })
  const window = useWindow()
  const state = useLSP()
  const { pushState } = useQuery()

  const handleSensitiveToggle = useCallback(() => {
    state.sensitive = !state.sensitive
  }, [])

  const handleToreadToggle = useCallback(() => {
    state.toread = !state.toread
  }, [])

  const handleStarToggle = useCallback(() => {
    state.starred = !state.starred
  }, [])

  const onPageNav = (/** @type{MouseEvent & {currentTarget: HTMLAnchorElement}} */ ev) => {
    if (window?.location) {
      const url = new URL(window.location.toString())
      const newUrl = new URL(ev.currentTarget?.href)
      if (url.pathname === newUrl.pathname) {
        ev.preventDefault()
        pushState(ev.currentTarget.href)
      }
    }
  }

  return html`
  <nav class="bc-header-nav">
    <div class="bc-header-start">
      <span class="bc-logo round">
        <span>🥖 </span>
        ${!user ? html`<a href="/">Breadcrum</a>` : null}
      </span>
      ${user ? html`<a class="bc-username" href='/account/'>${user.username}</a>` : null}
    </div>
    <div class="bc-header-end">
      ${!user
          ? html`<${LoginButtons}/>`
          : html`
            <div><a onClick='${onPageNav}' class="bc-decoration-none" href='/bookmarks/'>🔖<span class='bc-header-link-text'> bookmarks</span></a></div>
            <div><a class="bc-decoration-none" href='/tags/'>🏷<span class='bc-header-link-text'> tags</span></a></div>
            <div><a class="bc-decoration-none" href='/feeds/'>📡<span class='bc-header-link-text'> feeds</span></a></div>
            <div class="bc-header-button"><${ToRead} toread=${state.toread} onToggleRead=${handleToreadToggle} /></div>
            <div class="bc-header-button"><${Star} starred=${state.starred} onToggleStar=${handleStarToggle}/></div>
            <div class="bc-header-button"><${Sensitive} sensitive=${state.sensitive} onToggleSensitive=${handleSensitiveToggle}/></div>
            <div>· <a href='/logout/'>logout</a></div>`
      }
    </div>
  </nav>
  ${user && !user.email_confirmed && !['/email_confirm/'].includes(window?.location?.pathname ?? '')
    ? html`
      <div class="bc-header-email-warning">
        <a href="/account">${['/account/'].includes(window?.location?.pathname ?? '') ? 'Please confirm your email address below' : 'Click here to confirm your email address!'}</a>
      </div>`
    : null
  }
  ${user && user.disabled
    ? html`
      <div class="bc-header-email-disabled">
        <a href="/account/">${['/account/'].includes(window?.location?.pathname ?? '') ? 'Your account is disabled' : 'Your account is disabled. Click for details'}</a>
      </div>`
    : null
  }
  `
}
