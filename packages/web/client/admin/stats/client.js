/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()

  useEffect(() => {
    if ((!user && !loading) && window) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading, window])

  const [stats, setStats] = useState()
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(/** @type {Error | null} */(null))

  useEffect(() => {
    async function getStats () {
      setStatsLoading(true)
      setStatsError(null)

      try {
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
      } catch (err) {
        console.error(err)
        setStatsError(/** @type {Error} */(err))
      } finally {
        setStatsLoading(false)
      }
    }

    if (user) {
      getStats()
        .then(() => { console.log('stats done') })
        .catch(err => {
          console.error(err)
          setStatsError(/** @type {Error} */(err))
        })
        .finally(() => { setStatsLoading(false) })
    }
  }, [state.apiUrl, user])

  return html`
    <div class="bc-admin-stats">
      ${statsLoading ? html`<p>loading...</p>` : null}
      ${stats ? html`<pre><code>${JSON.stringify(stats, null, ' ')}</code></pre>` : null}
      ${statsError ? html`<p>${statsError.message}</p>` : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
