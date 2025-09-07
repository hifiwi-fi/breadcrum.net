/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useQuery } from '../../hooks/useQuery.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user, loading, error: userError } = useUser({ required: false })
  const { query } = useQuery()
  const [resetting, setResetting] = useState(false)
  const [reset, setReset] = useState(false)
  const [errorMessage, setErrorMessage] = useState(/** @type {string | null} */(null))

  useEffect(() => {
    if (user && !loading) window.location.replace('/account')
  }, [user?.id])

  async function resetPassword (/** @type {Event & {currentTarget: HTMLFormElement}} */ ev) {
    ev.preventDefault()
    setResetting(true)
    setErrorMessage(null)

    const form = /** @type {HTMLFormElement} */ (ev.currentTarget)
    const passwordElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('password'))

    if (!passwordElement) return

    const password = passwordElement.value
    const userId = query?.get('user_id')
    const token = query?.get('token')

    if (!userId) throw new Error('Missing userId in reset link. Did you modify the URL?')
    if (!token) throw new Error('Missing token in reset link. Did you modify the URL?')

    try {
      const response = await fetch(`${state.apiUrl}/user/password`, {
        method: 'post',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          password,
          userId,
          token: query?.get('token'),
        }),
        credentials: 'omit',
      })

      if (response.ok && response.status === 202) {
        await response.json()
        setReset(true)
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.error(err)
      setErrorMessage(/** @type {Error} */(err).message)
    } finally {
      setResetting(false)
    }
  }

  return html`
    ${!user
      ? reset
        ? html`
          <div>
            New password set
          </div>
          <div>
            <a href="/login/">Log in</a>
          </div>
        `
        : html`
          <div class="bc-password-set">
            <form class="password-set-form" id="password-set-form" onsubmit=${resetPassword}>
            <fieldset disabled=${resetting}>
              <legend>Set new password</legend>
              <div>
                <label class="block">
                  Password:
                  <input class="block" type="password" name="password" />
                </label>
              </div>
              <div class="button-cluster">
                <input name="submit-button" type="submit" />
              </div>
              ${errorMessage || userError
                  ? html`<div class="error-box">${errorMessage} ${userError}</div>`
                  : null
              }
            </fieldset>
          </form>
        </div>
      `
      : html`
        <div>Logged in as ${user.username}</div>
        <div>Redirecting to <a href="/account">account</a></div>
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
