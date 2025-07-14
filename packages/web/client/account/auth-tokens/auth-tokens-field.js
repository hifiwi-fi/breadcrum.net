/* eslint-env browser */
import { Component, html, useEffect, useState, useCallback } from 'uland-isomorphic'
import { fetch } from 'fetch-undici'
import { useLSP } from '../../hooks/useLSP.js'
import { useWindow } from '../../hooks/useWindow.js'
import { authTokensTable } from '../../components/auth-tokens-table/auth-tokens-table.js'

export const authTokensField = Component(({ user, reload }) => {
  const state = useLSP()
  const window = useWindow()

  const [tokens, setTokens] = useState()
  const [tokensLoading, setTokensLoading] = useState(false)
  const [tokensError, setTokensError] = useState(null)

  const [before, setBefore] = useState()
  const [after, setAfter] = useState()

  // Load tokens
  useEffect(() => {
    async function getTokens () {
      setTokensLoading(true)
      setTokensError(null)

      const params = new URLSearchParams()
      params.set('per_page', '10')
      params.set('sort', 'desc')

      // Add cursor params if they exist
      if (before) params.set('before', before)
      if (after) params.set('after', after)

      const response = await fetch(`${state.apiUrl}/user/auth-tokens?${params.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setTokens(body?.data)
        setBefore(body?.pagination?.before)
        setAfter(body?.pagination?.after)
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getTokens()
        .then(() => { console.log('tokens loaded') })
        .catch(err => { console.error(err); setTokensError(err) })
        .finally(() => { setTokensLoading(false) })
    }
  }, [user, state.apiUrl, reload, before, after])

  const onPageNav = useCallback((cursor, direction) => {
    if (direction === 'before') {
      setBefore(cursor)
      setAfter(null)
    } else {
      setAfter(cursor)
      setBefore(null)
    }
    reload()
  }, [reload])

  const handleDelete = useCallback(() => {
    // Reset to first page after deletion
    setBefore(null)
    setAfter(null)
    reload()
  }, [reload])

  return html`
    <dt>Active Sessions</dt>
    <dd>
      <div class="bc-auth-tokens-section">
        ${tokensLoading && !Array.isArray(tokens) ? html`<div>Loading sessions...</div>` : null}
        ${tokensError ? html`<div class="bc-error">${tokensError.message}</div>` : null}

        ${Array.isArray(tokens)
          ? html`
            <div class="bc-auth-tokens-container">
              ${tokens.length > 0
                ? html`
                  <div class="bc-pagination-controls">
                    ${after ? html`<button onclick=${() => onPageNav(after, 'after')}>← Previous</button>` : null}
                    ${before ? html`<button onclick=${() => onPageNav(before, 'before')}>Next →</button>` : null}
                  </div>

                  ${authTokensTable({ tokens, reload, onDelete: handleDelete })}

                  <div class="bc-pagination-controls">
                    ${after ? html`<button onclick=${() => onPageNav(after, 'after')}>← Previous</button>` : null}
                    ${before ? html`<button onclick=${() => onPageNav(before, 'before')}>Next →</button>` : null}
                  </div>
                `
                : html`<p>No active sessions found.</p>`
              }
            </div>
          `
          : null
        }

        <div class="bc-auth-tokens-info">
          <p><small>These are all the devices and browsers where you're currently logged in. You can revoke access to any session except your current one.</small></p>
        </div>
      </div>
    </dd>
  `
})
