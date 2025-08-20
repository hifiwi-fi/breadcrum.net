/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'
import { useQuery } from '../hooks/useQuery.js'
import { useWindow } from '../hooks/useWindow.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { query } = useQuery()
  const { user, error: userError } = useUser()
  const window = useWindow()
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [errorMessage, setErrorMessage] = useState(/** @type {string | null} */(null))

  useEffect(() => {
    async function confirmEmail () {
      setConfirming(true)
      setErrorMessage(null)

      const token = query?.get('token')

      if (!token) throw new Error('Missing email confirmation token')
      if (token.length !== 64) throw new Error('Invalid token')

      const updateParam = query?.get('update')
      const update = updateParam ? JSON.parse(updateParam) : null

      try {
        const response = await fetch(`${state.apiUrl}/user/email:verify`, {
          method: 'post',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ token, update }),
        })

        if (response.ok && response.status === 202) {
          await response.json()
          setConfirmed(true)
        } else {
          throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
        }
      } catch (err) {
        console.error(err)
        setErrorMessage(/** @type {Error} */(err).message)
      } finally {
        setConfirming(false)
      }
    }

    if (query) {
      confirmEmail().catch(err => {
        console.error(err)
        setErrorMessage(/** @type {Error} */(err).message)
        setConfirming(false)
      })
    }
  }, [query, state.apiUrl])

  return html`
    ${user
      ? confirmed
        ? html`
          <div>
            ${query && query.get('update') && JSON.parse(query.get('update') || '{}')
              ? 'Email address successfully updated!'
              : 'Email address confirmed!'
            }
          </div>
        `
        : html`
          <div class="bc-confirm-email">
            ${query
              ? html`
                ${!query.get('token') ? html`<div>Missing email confirm token</div>` : null}
                ${query.get('token')?.length !== 64 ? html`<div>Invalid email confirmation token</div>` : null}
              `
              : null
            }
            ${confirming ? html`<div>Confirming email address...</div>` : null}
            ${errorMessage || userError
                  ? html`<div class="error-box">${errorMessage} ${userError}</div>`
                  : null
              }
          </div>
      `
      : html`
        <div>Please login to confirm your email address.</div>
        <div>Redirecting to <a href="/login?redirect=${window ? encodeURIComponent(window.location.pathname + window.location.search) : '/email_confirm'}">login</a></div>
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
