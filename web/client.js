/* eslint-env browser */
import { html, render } from 'uland-isomorphic'
import { useUser } from './hooks/useUser.js'

export function homepage () {
  const { user, loading, error: userError } = useUser()

  return html`
    ${userError
      ? html`<div>${JSON.stringify(userError, null, ' ')}</div>`
      : null
    }
    ${
      loading
        ? html`<div>loading</div>`
        : null
    }
    <div class="bc-placeholder">
      <div>${user ? `Hello ${user.username}` : 'Coming soon'}</div>
      <div class="bc-big-bread">🥖</div>
    </div>
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), homepage)
}
