import { html } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useLSP } from '../hooks/useLSP.js'

export function header () {
  const { user, loading } = useUser()
  const window = useWindow()
  const state = useLSP()

  return html`
  <nav class="bc-header-nav">
    <div class="bc-header-start">
      <div class="round">
        <span>🥖 </span>
        <a href="/">Breadcrum</a>
      </div>
      ${user ? html`<div>(${user.username})</div>` : null}
    </div>
    <div class="bc-header-end">
      ${loading
        ? html`<div>...</div>`
        : !user
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
            <div><a href='/logout'>logout</a></div>`
      }

    </div>
  </nav>
  `
}
