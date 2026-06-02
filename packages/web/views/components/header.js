/**
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { ViewContext } from '../context.js'
 */

import html from 'fragtml'

/**
 * @param {ViewContext} context
 * @returns {HtmlRenderable}
 */
export function header (context) {
  const user = context.user
  const notices = serviceNotices(context)

  return html/* html */`
    <header class="bc-header">
      <nav class="bc-header-nav">
        <div class="bc-header-start">
          <span class="bc-logo">🥖 ${user ? 'Breadcrum' : html`<a href="/">Breadcrum</a>`}</span>
          ${user ? html`<a class="bc-username" href="/account/">${user.username}</a>` : null}
        </div>
        <div class="bc-header-end">
          ${user
            ? html/* html */`
              <a class="bc-decoration-none" href="/bookmarks/">🔖<span class="bc-header-link-text"> bookmarks</span></a>
              <a class="bc-decoration-none" href="/tags/">🏷<span class="bc-header-link-text"> tags</span></a>
              <a class="bc-decoration-none" href="/feeds/">📡<span class="bc-header-link-text"> feeds</span></a>
              ${filterLinks(context)}
              <span>·</span>
              <form class="bc-header-logout" method="post" action="/logout/">
                <button type="submit">logout</button>
              </form>
            `
            : html/* html */`
              <a href="/login/">login</a>
              <a href="/register/">register</a>
            `}
        </div>
      </nav>
      ${notices}
      ${user && !user.email_confirmed && context.currentPath !== '/email_confirm/'
        ? html/* html */`
          <div class="bc-header-email-warning">
            <a href="/account/">${context.currentPath === '/account/' ? 'Please confirm your email address below' : 'Click here to confirm your email address!'}</a>
          </div>
        `
        : null}
      ${user?.disabled
        ? html/* html */`
          <div class="bc-header-email-disabled">
            <a href="/account/">${context.currentPath === '/account/' ? 'Your account is disabled' : 'Your account is disabled. Click for details'}</a>
          </div>
        `
        : null}
    </header>
  `
}

/**
 * @param {ViewContext} context
 * @returns {HtmlRenderable}
 */
function filterLinks (context) {
  return html/* html */`
    <span class="bc-header-filters" aria-label="Bookmark filters">
      ${filterLink(context, 'toread', 'To read', '●', '○')}
      ${filterLink(context, 'starred', 'Starred', '★', '☆')}
      ${filterLink(context, 'sensitive', 'Sensitive', '🤫', '🫥')}
    </span>
  `
}

/**
 * @param {ViewContext} context
 * @param {'toread' | 'starred' | 'sensitive'} param
 * @param {string} label
 * @param {string} activeIcon
 * @param {string} inactiveIcon
 * @returns {HtmlRenderable}
 */
function filterLink (context, param, label, activeIcon, inactiveIcon) {
  const active = isQueryFlagActive(context, param)
  const href = toggledQueryHref(context, param)
  const action = active ? 'Disable' : 'Enable'

  return html/* html */`
    <a
      class="bc-header-filter ${active ? 'bc-header-filter--active' : ''}"
      href="${href}"
      aria-label="${action} ${label} filter"
      aria-pressed="${active ? 'true' : 'false'}"
      title="${action} ${label} filter"
    >${active ? activeIcon : inactiveIcon}</a>
  `
}

/**
 * @param {ViewContext} context
 * @returns {HtmlRenderable}
 */
function serviceNotices (context) {
  const noticeMessage = context.flags.service_notice_message.trim()
  const dismissibleMessage = context.flags.service_notice_dismissible_message.trim()
  const dismissibleHash = dismissibleMessage ? hashNoticeMessage(dismissibleMessage) : ''
  const showDismissible = Boolean(dismissibleMessage) &&
    (!context.user || context.user.service_notice_dismissed_hash !== dismissibleHash)

  return html/* html */`
    ${noticeMessage
      ? html/* html */`
        <div class="bc-header-service-notice" style="${bannerStyle(context.flags.service_notice_message_color)}">
          <span>${noticeMessage}</span>
        </div>
      `
      : null}
    ${showDismissible
      ? html/* html */`
        <div class="bc-header-service-notice bc-header-service-notice--dismissible" style="${bannerStyle(context.flags.service_notice_dismissible_message_color)}">
          <span>${dismissibleMessage}</span>
        </div>
      `
      : null}
  `
}

/**
 * @param {string} color
 * @returns {string}
 */
function bannerStyle (color) {
  const backgroundColor = color.trim()
  return backgroundColor ? `background-color: ${backgroundColor}` : ''
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

/**
 * @param {ViewContext} context
 * @param {'toread' | 'starred' | 'sensitive'} param
 * @returns {boolean}
 */
function isQueryFlagActive (context, param) {
  const url = new URL(context.currentPath, context.baseUrl)
  return url.searchParams.get(param) === 'true'
}

/**
 * @param {ViewContext} context
 * @param {'toread' | 'starred' | 'sensitive'} param
 * @returns {string}
 */
function toggledQueryHref (context, param) {
  const url = new URL(context.currentPath, context.baseUrl)

  if (isQueryFlagActive(context, param)) {
    url.searchParams.delete(param)
  } else {
    url.searchParams.set(param, 'true')
  }

  const query = url.searchParams.toString()
  return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
}
