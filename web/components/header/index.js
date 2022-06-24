import { Component, html, useCallback } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useLSP } from '../../hooks/useLSP.js'
import { sensitive } from '../sensitive/index.js'
import { useQuery } from '../../hooks/useQuery.js'

export const header = Component(() => {
  const { user } = useUser()
  const window = useWindow()
  const state = useLSP()
  const { pushState } = useQuery()

  const handleSensitiveToggle = useCallback(() => {
    state.sensitive = !state.sensitive
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
        ${user ? null : html`<a href="/">Breadcrum</a>`}
      </span>
      ${user ? html`<span><a href='/account'>${user.username}</a></span>` : null}
    </div>
    <div class="bc-header-end">
      ${!user
          ? html`
            ${
              window?.location?.pathname !== '/login/'
                ? html`
                  <div>
                    <a href='/login'>login</a>
                  </div>
                `
                : null
            }
            ${
              window?.location?.pathname !== '/login/' && window?.location?.pathname !== '/register/' && !state.disableRegistration
                ? html`
                  <div>/</div>
                `
                : null
            }
            ${
              window?.location?.pathname !== '/register/' && !state.disableRegistration
                ? html`
                  <div>
                    <a href='/register'>register</a>
                  </div>
                `
                : null
            }`
          : html`
            <div>🔖 <a onclick='${onPageNav}' href='/bookmarks/'>bookmarks</a></div>
            <div>🏷 <a href='/tags/'>tags</a></div>
            <div>${sensitive({ sensitive: state.sensitive, onclick: handleSensitiveToggle })}</div>
            <div>· <a href='/logout/'>logout</a></div>`
      }

    </div>
  </nav>
  `
})
