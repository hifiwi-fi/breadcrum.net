/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeTokenWithUserClient } from '../../routes/api/user/schemas/user-base.js' */
/**
 * @typedef {{
 *   sitekey: string,
 *   callback?: (token: string) => void,
 *   'timeout-callback'?: () => void,
 *   'expired-callback'?: (token: string) => void,
 *   'error-callback'?: (error: string) => void,
 * }} TurnstileRenderParams
 */
/**
 * @typedef {Object} TurnstileApi
 * @property {(container: string | HTMLElement, params?: TurnstileRenderParams) => string | null | undefined} render
 * @property {(container?: string | HTMLElement) => void} remove
 */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'
import { useFlags } from '../hooks/useFlags.js'

const turnstileSitekey = process.env['TURNSTILE_SITEKEY']

/** @type {FunctionComponent} */
export const Page = () => {
  const { user, loading, error: userError } = useUser({ required: false })
  const state = useLSP()
  const [submitting, setSubmitting] = useState(false)
  const { flags, loading: flagsLoading } = useFlags()
  const [registerError, setRegisterError] = useState(/** @type {Error | null} */(null))
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileError, setTurnstileError] = useState('')

  useEffect(() => {
    if ((user && !loading)) {
      window.location.replace('/docs/tutorial')
    }
  }, [user?.id])

  useEffect(() => {
    if (!turnstileSitekey) return
    /** @type {string | null | undefined} */
    let widgetId
    let isMounted = true

    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return
      setTurnstileError('Turnstile failed to load. Please refresh and try again.')
    }, 5000)

    const tryRender = () => {
      if (!isMounted) return
      const windowApi = /** @type {any} */ (window)
      /** @type {TurnstileApi | undefined} */
      const turnstileApi = windowApi.turnstile
      if (!turnstileApi) return

      widgetId = turnstileApi.render('#turnstile-container', {
        sitekey: turnstileSitekey,
        callback: function (token) {
          setTurnstileToken(token)
          setTurnstileError('')
        },
        'error-callback': function () {
          setTurnstileError('Turnstile failed to load. Please refresh and try again.')
        },
        'expired-callback': function () {
          setTurnstileToken('')
          setTurnstileError('Turnstile expired. Please try again.')
        },
        'timeout-callback': function () {
          setTurnstileToken('')
          setTurnstileError('Turnstile timed out. Please try again.')
        },
      })

      if (!widgetId) {
        setTurnstileError('Turnstile failed to load. Please refresh and try again.')
        return
      }

      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }

    const intervalId = window.setInterval(tryRender, 100)
    tryRender()

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
      if (widgetId) {
        const windowApi = /** @type {any} */ (window)
        windowApi.turnstile?.remove(widgetId)
      }
    }
  }, [])

  async function onRegister (/** @type {Event & {currentTarget: HTMLFormElement}} */ ev) {
    ev.preventDefault()
    setSubmitting(true)
    setRegisterError(null)

    try {
      const form = /** @type {HTMLFormElement} */ (ev.currentTarget)
      const emailElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('email'))
      const usernameElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('username'))
      const passwordElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('password'))
      const newsletterElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('newsletter_subscription'))

      if (!emailElement || !usernameElement || !passwordElement || !newsletterElement) return

      const email = emailElement.value
      const username = usernameElement.value
      const password = passwordElement.value
      const newsletter_subscription = newsletterElement.checked // eslint-disable-line camelcase

      if (!turnstileToken) {
        setTurnstileError('Turnstile verification required. Please complete the challenge.')
        setSubmitting(false)
        return
      }

      const requestBody = {
        email,
        username,
        password,
        // eslint-disable-next-line camelcase
        newsletter_subscription,
        turnstile_token: turnstileToken,
      }

      const response = await fetch(`${state.apiUrl}/register`, {
        method: 'post',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok && response.status === 201) {
        /** @type {TypeTokenWithUserClient} */
        const body = await response.json()
        state.user = body.user
        window.location.replace('/docs/tutorial')
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.log(err)
      setSubmitting(false)
      setRegisterError(/** @type {Error} */(err))
    }
  }

  return html`
    <div class="bc-register">
      <form class="register-form" id="register-form" onSubmit=${onRegister}>
        <fieldset disabled="${Boolean(user) || submitting || !flags.registration || flagsLoading}">
          <legend>${flags.registration ? 'Register:' : 'Registration closed. Please come back soon!'}</legend>
          <div>
            <label class="block">
              Email:
              <input
                class="block"
                minlength="1"
                maxlength="200"
                type="email"
                name="email"
                autocomplete="email"
              />
            </label>
          </div>
          <div>
            <label class="block">
              Username:
              <input
                class="block"
                pattern="^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$"
                minlength="1"
                maxlength="50"
                type="text"
                name="username"
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
                name="password"
                minlength="8"
                maxlength="255"
                autocomplete="new-password"
              />
            </label>
          </div>
          <div>
            <label class="checkbox-label">
              <input type="checkbox" name="newsletter_subscription" />
              Subscribe to news and updates
            </label>
          </div>
          <div>
            <div id="turnstile-container"></div>
            ${turnstileError ? html`<p>${turnstileError}</p>` : null}
          </div>
          <div class="button-cluster">
            <input
              name="submit-button"
              type="submit"
              disabled=${!turnstileToken}
            />
          </div>
        </fieldset>
      </form>
      <div class="bc-register-terms">
        <p>
          By registering you agree to our <a href="/legal/terms/">Terms of Service</a> and <a href="/legal/privacy/">Privacy Policy</a>.
        </p>
      </div>
    </div>
    ${userError
      ? html`<div>${userError?.message}</div>`
      : null
    }
    ${registerError ? html`<p>${registerError.message}</p>` : null}
`
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
