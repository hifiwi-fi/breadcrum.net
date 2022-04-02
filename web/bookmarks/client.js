/* eslint-env browser */
import { html, render, useEffect } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'

export function bookmarksPage () {
  const { user, loading } = useUser()

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user])

  return html`
    <div>Show bookmarks here</div>
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), bookmarksPage)
}
