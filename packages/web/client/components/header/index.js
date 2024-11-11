import { Component, html, useCallback } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { sensitive } from '../sensitive/index.js'
import { toread } from '../toread/index.js'
import { star } from '../star/index.js'
import { useQuery } from '../../hooks/useQuery.js'
import { loginButtons } from './login-buttons.js'

export const header = Component(() => {
  const { user } = useUser()
  const window = useWindow()
  const state = useLSP()
  const { pushState } = useQuery()

  const handleSensitiveToggle = useCallback(() => {
    state.sensitive = !state.sensitive
  })

  const handleToreadToggle = useCallback(() => {
    state.toread = !state.toread
  })

  const handleStarToggle = useCallback(() => {
    state.starred = !state.starred
  })

  const onPageNav = (ev) => {
    const url = new URL(window.location)
    const newUrl = new URL(ev.currentTarget.href)
    if (url.pathname === newUrl.pathname) {
      ev.preventDefault()
      pushState(ev.currentTarget.href)
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
          ? loginButtons()
          : html`
            <div><a onclick='${onPageNav}' class="bc-decoration-none" href='/bookmarks/'>🔖<span class='bc-header-link-text'> bookmarks</span></a></div>
            <div><a class="bc-decoration-none" href='/tags/'>🏷<span class='bc-header-link-text'> tags</span></a></div>
            <div><a class="bc-decoration-none" href='/feeds/'>📡<span class='bc-header-link-text'> feeds</span></a></div>
            <div class="bc-header-button">${toread({ toread: state.toread, onclick: handleToreadToggle })}</div>
            <div class="bc-header-button">${star({ starred: state.starred, onclick: handleStarToggle })}</div>
            <div class="bc-header-button">${sensitive({ sensitive: state.sensitive, onclick: handleSensitiveToggle })}</div>
            <div>· <a href='/logout/'>logout</a></div>`
      }
    </div>
  </nav>
  ${user && !user.email_confirmed && !['/email_confirm/'].includes(window?.location?.pathname)
    ? html`
      <div class="bc-header-email-warning">
        <a href="/account">${['/account/'].includes(window?.location?.pathname) ? 'Please confirm your email address below' : 'Click here to confirm your email address!'}</a>
      </div>`
    : null
  }
  ${user && user.disabled
    ? html`
      <div class="bc-header-email-disabled">
        <a href="/account/">${['/account/'].includes(window?.location?.pathname) ? 'Your account is disabled' : 'Your account is disabled. Click for details'}</a>
      </div>`
    : null
  }
  `
})
