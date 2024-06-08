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

  const [stats, setStats] = useState()
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(false)

  useEffect(() => {
    async function getStats () {
      setStatsLoading(true)
      setStatsError(null)

      const response = await fetch(`${state.apiUrl}/admin/stats`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setStats(body)
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getStats()
        .then(() => { console.log('stats done') })
        .catch(err => { console.error(err); setStatsError(err) })
        .finally(() => { setStatsLoading(false) })
    }
  }, [state.apiUrl])

  return html`
    <div class="bc-admin-stats">
      ${statsLoading ? html`<p>loading...</p>` : null}
      ${stats ? html`<pre><code>${JSON.stringify(stats, null, ' ')}</code></pre>` : null}
      ${statsError ? html`<p>${statsError.message}</p>` : null}
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
