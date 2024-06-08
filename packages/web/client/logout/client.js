/* eslint-env browser */
import { Component, html, render, useEffect } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'

export const page = Component(() => {
  const state = useLSP()
  const { user } = useUser()

  useEffect(() => {
    const logout = async () => {
      try {
        await fetch(`${state.apiUrl}/logout`, {
          method: 'post',
        })
      } finally {
        state.user = null
        window.location.replace('/')
      }
    }

    logout().catch(err => {
      console.error(err)
    })
  }, [])

  return html`
    ${!user
      ? html`
        <div>
          Logged out
        </div>
      `
      : html`
        <div>
          Logging out of ${user.username}
        </div>
      `
    }
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
