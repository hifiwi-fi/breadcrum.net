/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */
import { html } from 'htm/preact'
import { useCallback, useMemo } from 'preact/hooks'

import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useQuery } from '../../hooks/useQuery.js'
import { useFlags } from '../../hooks/useFlags.js'
import { Sensitive } from '../sensitive/index.js'
import { ToRead } from '../toread/index.js'
import { Star } from '../star/index.js'
import { LoginButtons } from './login-buttons.js'

/** @type{FunctionComponent<{}>} */
export const Header = () => {
  const { user } = useUser({ required: false })
  const window = useWindow()
  const state = useLSP()
  const { flags } = useFlags()
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

  const noticeMessage = typeof flags?.['service_notice_message'] === 'string'
    ? flags['service_notice_message'].trim()
    : ''

  const dismissibleMessage = typeof flags?.['service_notice_dismissible_message'] === 'string'
    ? flags['service_notice_dismissible_message'].trim()
    : ''

  const noticeMessageColor = typeof flags?.['service_notice_message_color'] === 'string'
    ? flags['service_notice_message_color'].trim()
    : ''

  const dismissibleMessageColor = typeof flags?.['service_notice_dismissible_message_color'] === 'string'
    ? flags['service_notice_dismissible_message_color'].trim()
    : ''

  const dismissibleHash = useMemo(
    () => (dismissibleMessage ? hashNoticeMessage(dismissibleMessage) : ''),
    [dismissibleMessage]
  )

  const userDismissedHash = user?.service_notice_dismissed_hash ?? null
  const showDismissibleNotice = Boolean(dismissibleMessage) && (!user || userDismissedHash !== dismissibleHash)

  const noticeStyle = noticeMessageColor ? { backgroundColor: noticeMessageColor } : undefined
  const dismissibleStyle = dismissibleMessageColor ? { backgroundColor: dismissibleMessageColor } : undefined

  const handleDismissNotice = useCallback(async () => {
    if (!user || !dismissibleHash) return

    const previousUser = user
    state.user = { ...user, service_notice_dismissed_hash: dismissibleHash }

    try {
      const response = await fetch(`${state.apiUrl}/user`, {
        method: 'put',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          service_notice_dismissed_hash: dismissibleHash,
        }),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    } catch (err) {
      console.error(err)
      state.user = previousUser
    }
  }, [dismissibleHash, state.apiUrl, user])

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
  ${noticeMessage
    ? html`
      <div class="bc-header-service-notice" style=${noticeStyle}>
        <span>${noticeMessage}</span>
      </div>`
    : null
  }
  ${showDismissibleNotice
    ? html`
      <div class="bc-header-service-notice bc-header-service-notice--dismissible" style=${dismissibleStyle}>
        <span>${dismissibleMessage}</span>
        ${user
          ? html`<button type="button" class="bc-header-service-notice-dismiss" onClick=${handleDismissNotice}>Dismiss</button>`
          : null
        }
      </div>`
    : null
  }
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

/**
 * @param {string} message
 * @returns {string}
 */
function hashNoticeMessage (message) {
  let hash = 5381
  for (let i = 0; i < message.length; i += 1) {
    hash = ((hash << 5) + hash) ^ message.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}
