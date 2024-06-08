/* eslint-env browser */
import { Component, html, render, useState, useEffect, useCallback, useRef } from 'uland-isomorphic'
import { useLSP } from '../hooks/useLSP.js'
import { useQuery } from '../hooks/useQuery.js'

export const page = Component(() => {
  const state = useLSP()
  const { query } = useQuery()
  const [unsubscribing, setUnsubscribing] = useState(false)
  const [unsubscribed, setUnsubscribed] = useState(null)
  const [error, setError] = useState(null)

  const formRef = useRef()

  const handleUnsubscribe = useCallback(async (ev) => {
    ev?.preventDefault()
    setUnsubscribing(true)
    setError(null)

    try {
      const email = formRef.current.email.value

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
      setError(err)
    } finally {
      setUnsubscribing(false)
    }
  },
  [state.apiUrl, setUnsubscribing, setUnsubscribed, setError])

  useEffect(() => {
    if (query?.get('email')) {
      handleUnsubscribe().catch(err => setError(err))
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
            <form ref="${formRef}" class="bc-unsubscribe-form" id="bc-unsubscribe-form" onsubmit=${handleUnsubscribe}>
            <fieldset ?disabled=${unsubscribing}>
              <legend>Unsubscribe</legend>
              <div>
                <div class="bc-help-text">
                  ℹ️ Unsubscribe from Breadcrum emails
                </div>
                <label class="block">
                  Email:
                  <input class="block" type="email" name="email" .value=${query?.get('email')} />
                </label>
              </div>
              <div class="button-cluster">
                <input name="submit-button" type="submit">
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
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
