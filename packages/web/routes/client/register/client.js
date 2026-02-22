/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeTokenWithUserClient } from '../../api/user/schemas/user-base.js' */
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

/** @type {FunctionComponent} */
export const Page = () => {
  const { user, loading, error: userError } = useUser({ required: false })
  const state = useLSP()
  const [submitting, setSubmitting] = useState(false)
  const { flags, loading: flagsLoading } = useFlags()
  const [registerError, setRegisterError] = useState(/** @type {Error | null} */(null))
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileError, setTurnstileError] = useState('')
  const [turnstileSitekey, setTurnstileSitekey] = useState('')
  const clearValidationMessage = (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    ev.currentTarget.setCustomValidity('')
  }

  const handleEmailInvalid = (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    const input = ev.currentTarget
    if (input.validity.valueMissing) {
      input.setCustomValidity('Email is required.')
    } else if (input.validity.typeMismatch) {
      input.setCustomValidity('Enter a valid email address.')
    } else if (input.validity.tooLong) {
      input.setCustomValidity('Email must be 200 characters or fewer.')
    } else {
      input.setCustomValidity('Enter a valid email address.')
    }
  }

  const handleUsernameInvalid = (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    const input = ev.currentTarget
    if (input.validity.valueMissing) {
      input.setCustomValidity('Username is required.')
    } else if (input.validity.patternMismatch) {
      input.setCustomValidity('Use letters and numbers with ., _, or - between characters.')
    } else if (input.validity.tooLong) {
      input.setCustomValidity('Username must be 50 characters or fewer.')
    } else if (input.validity.tooShort) {
      input.setCustomValidity('Username must be at least 1 character.')
    } else {
      input.setCustomValidity('Enter a valid username.')
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

  useEffect(() => {
    if ((user && !loading)) {
      window.location.replace('/docs/tutorial')
    }
  }, [user?.id])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadTurnstileKey = async () => {
      try {
        const response = await fetch(`${state.apiUrl}/config`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Config request failed: ${response.status} ${response.statusText}`)
        }

        const body = /** @type {{ turnstile_sitekey?: string }} */ (await response.json())
        const sitekey = body.turnstile_sitekey

        if (!isMounted) return

        if (!sitekey) {
          setTurnstileError('Turnstile configuration missing. Please try again later.')
          return
        }

        setTurnstileError('')
        setTurnstileSitekey(sitekey)
      } catch (error) {
        if (!isMounted) return
        if (/** @type {{ name?: string }} */ (error)?.name === 'AbortError') return
        setTurnstileError('Turnstile configuration failed to load. Please refresh and try again.')
      }
    }

    loadTurnstileKey()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [state.apiUrl])

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
  }, [turnstileSitekey])

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
        <fieldset disabled="${Boolean(user) || submitting || !flags['registration'] || flagsLoading}">
          <legend>${flags['registration'] ? 'Register:' : 'Registration closed. Please come back soon!'}</legend>
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
                onInput=${clearValidationMessage}
                onInvalid=${handleEmailInvalid}
                required
              />
              <span class="bc-help-text">Use a valid email address (max 200 characters).</span>
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
                onInput=${clearValidationMessage}
                onInvalid=${handleUsernameInvalid}
                required
              />
              <span class="bc-help-text">1-50 characters. Letters and numbers; you may use ., _, or - between characters.</span>
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
                onInput=${clearValidationMessage}
                onInvalid=${handlePasswordInvalid}
                required
              />
              <span class="bc-help-text">At least 8 characters (max 255).</span>
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
