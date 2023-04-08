/* eslint-env browser */
import { Component, html, render, useState, useEffect } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading, error: userError } = useUser()
  const [resetting, setResetting] = useState(false)
  const [reset, setReset] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (user && !loading) window.location.replace('/account')
  }, [user])

  async function resetPassword (ev) {
    ev.preventDefault()
    setResetting(true)
    setErrorMessage(null)

    const email = ev.currentTarget.email.value

    try {
      const response = await fetch(`${state.apiUrl}/user/password:reset`, {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ email }),
        credentials: 'omit'
      })

      if (response.ok && response.status === 202) {
        const body = await response.json()
        setReset(true)
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message)
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
            <fieldset ?disabled=${resetting}>
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
                <input name="submit-button" type="submit">
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
        <div>Redirecting to <a href="/account">account</a></button>
        `
    }
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
