/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useMutation } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { useUser } from '../../hooks/useUser.js'
import { mountPage } from '../../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  useUser()

  const flushMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${state.apiUrl}/admin/redis/flush-cache`, {
        method: 'POST',
        headers: { accept: 'application/json' },
      })

      if (response.ok) {
        return response.json()
      }

      const errorBody = await response.text()
      throw new Error(errorBody || `HTTP ${response.status}`)
    },
  })

  const status = flushMutation.isSuccess ? (flushMutation.data?.status || 'Cache cleared') : null

  return html`
    <div class="bc-flush-cache">
      <h2>Redis Cache Admin</h2>

      <p>This will flush all cache keys from the Redis instance used by the app. Use with caution.</p>

      <button disabled=${flushMutation.isPending} onClick=${() => flushMutation.mutate()}>
        ${flushMutation.isPending ? 'Flushing…' : 'Flush Redis Cache'}
      </button>

      ${status ? html`<p class="success">${status}</p>` : null}
      ${flushMutation.error ? html`<p class="error">${/** @type {Error} */(flushMutation.error).message}</p>` : null}
    </div>
  `
}

mountPage(Page)
