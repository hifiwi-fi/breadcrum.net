/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import { useLSP } from '../hooks/useLSP.js'
import { useQuery } from '../hooks/useQuery.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { query } = useQuery()
  const [unsubscribing, setUnsubscribing] = useState(false)
  const [unsubscribed, setUnsubscribed] = useState(/** @type {string | null} */(null))
  const [error, setError] = useState(/** @type {Error | null} */(null))

  const formRef = useRef(/** @type {HTMLFormElement | null} */(null))

  const handleUnsubscribe = useCallback(async (/** @type {Event | undefined} */ ev = undefined) => {
    ev?.preventDefault()
    setUnsubscribing(true)
    setError(null)

    try {
      const form = /** @type {HTMLFormElement | null} */ (formRef.current)
      if (!form) return

      const emailElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('email'))
      if (!emailElement) return

      const email = emailElement.value

      const response = await fetch(`${state.apiUrl}/user/email/unsubscribe?email=${email}`, {
        method: 'post',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setUnsubscribed(email)
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.error(err)
      setError(/** @type {Error} */(err))
    } finally {
      setUnsubscribing(false)
    }
  },
  [state.apiUrl, setUnsubscribing, setUnsubscribed, setError])

  useEffect(() => {
    if (query?.get('email')) {
      handleUnsubscribe().catch(err => setError(/** @type {Error} */(err)))
    }
  }, [])

  return html`
    ${unsubscribed
        ? html`
          <div>
            ${unsubscribed} will no longer receive any emails from breadcrum.
          </div>
          <div>Go to your <a href="/account">account</a> page to re-subscribe.</div>
        `
        : html`
          <div class="bc-unsubscribe">
            <form ref=${formRef} class="bc-unsubscribe-form" id="bc-unsubscribe-form" onsubmit=${handleUnsubscribe}>
            <fieldset disabled=${unsubscribing}>
              <legend>Unsubscribe</legend>
              <div>
                <div class="bc-help-text">
                  ℹ️ Unsubscribe from Breadcrum emails
                </div>
                <label class="block">
                  Email:
                  <input class="block" type="email" name="email" defaultValue=${query?.get('email') || ''} />
                </label>
              </div>
              <div class="button-cluster">
                <input name="submit-button" type="submit" />
              </div>
            </fieldset>
          </form>
        </div>
      `

    }

    ${error
      ? html`<div>${error?.message}</div>`
      : null
      }
`
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
