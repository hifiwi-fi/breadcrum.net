/* eslint-env browser */
import { Component, html, render, useEffect } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { useWindow } from '../../hooks/useWindow.js'

export const page = Component(() => {
  const { user, loading } = useUser()
  const window = useWindow()

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  return html`
    <div>
      Bookmark permalink go here
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
