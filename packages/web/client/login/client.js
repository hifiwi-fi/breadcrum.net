/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'
import { useQuery } from '../hooks/useQuery.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user, loading, error: userError } = useUser({ required: false })
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState(/** @type {Error | null} */(null))
  const { query } = useQuery()

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
        const body = await response.json()
        state.user = body?.user
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
            <fieldset disabled=${loggingIn}>
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
                    autocomplete="username"
                  />
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
                  />
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
    ${loginError ? html`<p>${loginError.message}</p>` : null}
`
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
