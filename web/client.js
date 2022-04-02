/* eslint-env browser */
import { html, render, useEffect } from 'uland-isomorphic'
import { useUser } from './hooks/useUser.js'

export function homepage () {
  const { user, loading } = useUser()

  useEffect(() => {
    if (user && !loading) window.location.replace('/bookmarks')
  }, [user])

  return html`
    <div class="bc-placeholder">
      <div>${user ? `Hello ${user.username}` : 'Coming soon'}</div>
      <div class="bc-big-bread">🥖</div>
    </div>
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), homepage)
}
