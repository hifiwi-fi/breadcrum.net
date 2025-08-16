/* eslint-env browser */
import { Component, html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()

  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user])

  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleFlushCache () {
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
      setError(err.message || 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return html`
    <div class="bc-flush-cache">
      <h2>Redis Cache Admin</h2>

      <p>This will flush all cache keys from the Redis instance used by the app. Use with caution.</p>

      <button ?disabled=${isSubmitting} onClick=${handleFlushCache}>
        ${isSubmitting ? 'Flushing…' : 'Flush Redis Cache'}
      </button>

      ${status ? html`<p class="success">${status}</p>` : null}
      ${error ? html`<p class="error">${error}</p>` : null}
    </div>
  `
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
