/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeTokenWithUserClient } from '../../routes/api/user/schemas/user-base.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'
import { useQuery } from '../hooks/useQuery.js'
import { client } from '@passwordless-id/webauthn'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user, loading, error: userError } = useUser({ required: false })
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState(/** @type {Error | null} */(null))
  const [passkeyAuthInProgress, setPasskeyAuthInProgress] = useState(false)
  const [passkeyAuthError, setPasskeyAuthError] = useState(/** @type {Error | null} */(null))
  const { query } = useQuery()
  const clearValidationMessage = (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    ev.currentTarget.setCustomValidity('')
  }

  const handleUserInvalid = (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    const input = ev.currentTarget
    if (input.validity.valueMissing) {
      input.setCustomValidity('Email or username is required.')
    } else if (input.validity.tooLong) {
      input.setCustomValidity('Email or username must be 200 characters or fewer.')
    } else if (input.validity.tooShort) {
      input.setCustomValidity('Email or username must be at least 1 character.')
    } else {
      input.setCustomValidity('Enter a valid email or username.')
    }
  }

  const handlePasswordInvalid = (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    const input = ev.currentTarget
    if (input.validity.valueMissing) {
      input.setCustomValidity('Password is required.')
    } else if (input.validity.tooShort) {
      input.setCustomValidity('Password must be at least 8 characters.')
    } else if (input.validity.tooLong) {
      input.setCustomValidity('Password must be 255 characters or fewer.')
    } else {
      input.setCustomValidity('Enter a valid password.')
    }
  }

  // Redirect when logged in
  useEffect(() => {
    if (user && !loading) {
      const pageParams = new URLSearchParams(query || '')
      let destination
      const redirectParam = pageParams.get('redirect')
      if (redirectParam) {
        // Ensure only a path gets passed and not an open redirect
        const url = new URL(redirectParam, 'https://example.com')
        destination = `${url.pathname}${url.search}`
      } else {
        destination = '/bookmarks'
      }
      window.location.replace(destination)
    }
  }, [user?.id])

  // Conditional mediation for passkey auto-prompt
  useEffect(() => {
    if (user || loading) return

    /**
     * @param {unknown} err
     * @returns {boolean}
     */
    function isAbortError (err) {
      if (!err || typeof err !== 'object') return false

      const maybeError = /** @type {{ name?: unknown, message?: unknown, cause?: unknown }} */ (err)
      if (maybeError.name === 'AbortError') return true

      if (typeof maybeError.message === 'string' && maybeError.message.includes('AbortError')) {
        return true
      }

      if (maybeError.cause && typeof maybeError.cause === 'object') {
        const maybeCause = /** @type {{ name?: unknown, message?: unknown }} */ (maybeError.cause)
        if (maybeCause.name === 'AbortError') return true
        if (typeof maybeCause.message === 'string' && maybeCause.message.includes('AbortError')) {
          return true
        }
      }

      return false
    }

    async function tryConditionalMediation () {
      try {
        setPasskeyAuthError(null)
        // Check if conditional mediation is available
        const isAutocompleteAvailable = await client.isAutocompleteAvailable()
        if (!isAutocompleteAvailable) {
          return // Browser doesn't support conditional mediation
        }

        setPasskeyAuthInProgress(true)

        // Get challenge from server (no user required for conditional mediation)
        const challengeResponse = await fetch(`${state.apiUrl}/user/passkeys/authenticate/challenge`, {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        })

        if (!challengeResponse.ok) {
          throw new Error(`Failed to get challenge: ${challengeResponse.status}`)
        }

        const { challenge } = await challengeResponse.json()

        // Start conditional mediation - waits for user to select from autocomplete
        const authentication = await client.authenticate({
          challenge,
          autocomplete: true,
          userVerification: 'required',
        })

        // Verify and login
        const verifyResponse = await fetch(`${state.apiUrl}/user/passkeys/authenticate/verify`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            authentication: {
              ...authentication,
              challenge
            }
          }),
        })

        if (verifyResponse.ok && verifyResponse.status === 201) {
          /** @type {TypeTokenWithUserClient} */
          const body = await verifyResponse.json()
          state.user = body.user
          // Redirect will happen via the user effect
        } else {
          const errorText = await verifyResponse.text()
          throw new Error(`Passkey login failed: ${verifyResponse.status} ${verifyResponse.statusText} ${errorText}`)
        }
      } catch (err) {
        if (!isAbortError(err)) {
          const error = /** @type {Error} */(err)
          console.error('Conditional mediation failed:', error)
          setPasskeyAuthError(error)
        } else {
          // Safari/iOS cancels the conditional prompt via AbortSignal when the user dismisses it.
        }
      } finally {
        setPasskeyAuthInProgress(false)
      }
    }

    tryConditionalMediation()
  }, [user, loading, state.apiUrl])

  async function login (/** @type {Event & {currentTarget: HTMLFormElement}} */ ev) {
    ev.preventDefault()
    setLoggingIn(true)
    setLoginError(null)

    const form = /** @type {HTMLFormElement} */ (ev.currentTarget)
    const userElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('user'))
    const passwordElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('password'))

    if (!userElement || !passwordElement) return

    const user = userElement.value
    const password = passwordElement.value

    try {
      const response = await fetch(`${state.apiUrl}/login`, {
        method: 'post',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user, password }),
      })

      if (response.ok && response.status === 201) {
        /** @type {TypeTokenWithUserClient} */
        const body = await response.json()
        state.user = body.user
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.log(err)
      setLoginError(/** @type {Error} */(err))
    } finally {
      setLoggingIn(false)
    }
  }

  return html`
    ${!user
      ? html`
        <div class="bc-login">
          <form class="login-form" id="login-form" onSubmit=${login}>
            <fieldset disabled=${loggingIn || passkeyAuthInProgress}>
              <legend>Log in:</legend>
              <div>
                <label class="block">
                  Email or Username:
                  <input
                    class="block"
                    minlength="1"
                    maxlength="200"
                    type="text"
                    name="user"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    autocomplete="username webauthn"
                    onInput=${clearValidationMessage}
                    onInvalid=${handleUserInvalid}
                    required
                  />
                  <span class="bc-help-text">Use your email or username (1-200 characters).</span>
                </label>
              </div>
              <div>
                <label class="block">
                  Password:
                  <input
                    class="block"
                    type="password"
                    minlength="8"
                    maxlength="255"
                    name="password"
                    autocomplete="current-password"
                    onInput=${clearValidationMessage}
                    onInvalid=${handlePasswordInvalid}
                    required
                  />
                  <span class="bc-help-text">At least 8 characters (max 255).</span>
                </label>
              </div>
              <div class="button-cluster">
                <input name="submit-button" type="submit" />
              </div>
          </fieldset>
        </form>
        <div class="bc-login-password-reset-link">
          <a href='/password_reset'>Forgot password?</a>
        </div>
      </div>
      `
      : html`
        <div>Logged in as ${user.username}</div>
        <div>Redirecting to <a href="/">/</a></div>
        `
    }
    ${userError
      ? html`<div>${JSON.stringify(userError, null, ' ')}</div>`
      : null
    }
    ${passkeyAuthError ? html`<p>${passkeyAuthError.message}</p>` : null}
    ${loginError ? html`<p>${loginError.message}</p>` : null}
`
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
