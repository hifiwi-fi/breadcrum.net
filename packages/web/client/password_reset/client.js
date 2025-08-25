/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user, loading, error: userError } = useUser({ required: false })
  const [resetting, setResetting] = useState(false)
  const [reset, setReset] = useState(false)
  const [errorMessage, setErrorMessage] = useState(/** @type {string | null} */(null))

  useEffect(() => {
    if (user && !loading) window.location.replace('/account')
  }, [user])

  async function resetPassword (/** @type {Event & {currentTarget: HTMLFormElement}} */ ev) {
    ev.preventDefault()
    setResetting(true)
    setErrorMessage(null)

    const form = /** @type {HTMLFormElement} */ (ev.currentTarget)
    const emailElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('email'))

    if (!emailElement) return

    const email = emailElement.value

    try {
      const response = await fetch(`${state.apiUrl}/user/password:reset`, {
        method: 'post',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email }),
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
            Email sent with password reset instructions.
          </div>
        `
        : html`
          <div class="bc-password-reset">
            <form class="password-reset-form" id="password-reset-form" onsubmit=${resetPassword}>
            <fieldset disabled=${resetting}>
              <legend>Reset Password</legend>
              <div class="bc-help-text">
                  ℹ️ Reset your password by submitting your email address below. If an account exists with that email address, a password email will be sent.
              </div>
              <div>
                <label class="block">
                  Account Email
                  <input class="block" type="email" name="email" />
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
