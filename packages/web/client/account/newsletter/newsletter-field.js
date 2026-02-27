/// <reference lib="dom" />

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { useMutation, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 * }} NewsletterFieldProps
 */

/**
 * @type {FunctionComponent<NewsletterFieldProps>}
 */
export const NewsletterField = ({ user }) => {
  const state = useLSP()
  const queryClient = useQueryClient()

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
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', state.apiUrl] })
    },
  })

  const handleToggle = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    await toggleMutation.mutateAsync(!user?.newsletter_subscription)
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
