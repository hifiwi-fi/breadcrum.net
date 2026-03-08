/// <reference lib="dom" />

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { useMutation } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 *  onSuccess?: () => void,
 * }} NewsletterFieldProps
 */

/**
 * @type {FunctionComponent<NewsletterFieldProps>}
 */
export const NewsletterField = ({ user, onSuccess }) => {
  const state = useLSP()

  const toggleMutation = useMutation({
    mutationFn: async (/** @type {boolean} */ newSubscriptionState) => {
      const response = await fetch(`${state.apiUrl}/user`, {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newsletter_subscription: newSubscriptionState }),
      })
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
      return await response.json()
    },
    onSuccess: () => {
      onSuccess?.()
    },
  })

  const handleToggle = useCallback((/** @type {Event} */ev) => {
    ev.preventDefault()
    toggleMutation.mutate(!user?.newsletter_subscription)
  }, [toggleMutation, user?.newsletter_subscription])

  return html`
  <dt>Newsletter</dt>
  <dd>
    <label>
      <input class="newsletter-label" onClick=${handleToggle} type="checkbox" name="newsletter-subscription" disabled=${toggleMutation.isPending} indeterminate=${toggleMutation.isPending} checked=${user?.newsletter_subscription} />
      <span>Subscribed</span>
    </label>
    ${toggleMutation.error ? html`<div class="error-box">${/** @type {Error} */(toggleMutation.error).message}</div>` : null}
  </dd>
  `
}
