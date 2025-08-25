/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useState, useCallback } from 'preact/hooks'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  useUser()

  const [status, setStatus] = useState(/** @type {string | null} */(null))
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFlushCache = useCallback(async () => {
    setIsSubmitting(true)
    setStatus(null)
    setError(null)

    try {
      const response = await fetch(`${state.apiUrl}/admin/redis/flush-cache`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        setStatus(result.status || 'Cache cleared')
      } else {
        const errorBody = await response.text()
        throw new Error(errorBody || `HTTP ${response.status}`)
      }
    } catch (err) {
      console.error(err)
      setError(/** @type {Error} */(err))
    } finally {
      setIsSubmitting(false)
    }
  }, [state.apiUrl])

  return html`
    <div class="bc-flush-cache">
      <h2>Redis Cache Admin</h2>

      <p>This will flush all cache keys from the Redis instance used by the app. Use with caution.</p>

      <button disabled=${isSubmitting} onClick=${handleFlushCache}>
        ${isSubmitting ? 'Flushing…' : 'Flush Redis Cache'}
      </button>

      ${status ? html`<p class="success">${status}</p>` : null}
      ${error ? html`<p class="error">${error.message}</p>` : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
