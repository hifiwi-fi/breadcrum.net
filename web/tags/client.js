/* eslint-env browser */
import { html, render, useEffect } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'

export default function page () {
  const { user, loading } = useUser()
  const window = useWindow()

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  return html`
    <div>
      Tags go here
    </div>
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}