/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js'
 */
// @ts-expect-error
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'

/**
 * @typedef {({
 *  user,
 *  reload,
 * }: {
 *  user: TypeUserRead | null,
 *  reload: () => void,
 * }) => any} NewsletterField
 */

/**
 * @type {NewsletterField}
 */
export const newsletterField = Component(/** @type{NewsletterField} */({ user, reload }) => {
  const state = useLSP()
  const [error, setError] = useState(null)
  const [disabled, setDisabled] = useState(false)

  const handleToggle = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const newSubscriptionState = !user?.newsletter_subscription

    const formState = {
      newsletter_subscription: newSubscriptionState,
    }

    try {
      const endpoint = `${state.apiUrl}/user`
      const response = await fetch(endpoint, {
        method: 'put',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(formState),
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        console.log(await response.json())
        reload()
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    } catch (err) {
      setError(err)
    } finally {
      setDisabled(false)
    }
  }, [state.apiUrl, setDisabled, setError, user?.newsletter_subscription, reload])

  return html`
  <dt>Newsletter</dt>
  <dd>
    <label>
      <input onclick="${handleToggle}" type="checkbox" name="newsletter-subscription" ?disabled=${disabled} .indeterminate=${disabled} .checked=${user?.newsletter_subscription}>
      Subscribed
    </label>
    ${error ? html`<div class="error-box">${error.message}</div>` : null}
  </dd>
  `
})
