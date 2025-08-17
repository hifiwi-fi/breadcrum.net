/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'

/** @type {FunctionComponent} */
export const Page = () => {
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
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
