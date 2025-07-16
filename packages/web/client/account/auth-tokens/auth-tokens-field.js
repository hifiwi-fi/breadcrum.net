/* eslint-env browser */
import { Component, html, useEffect, useState, useCallback } from 'uland-isomorphic'
import { fetch } from 'fetch-undici'
import { useLSP } from '../../hooks/useLSP.js'
import { authTokensTable } from '../../components/auth-tokens-table/auth-tokens-table.js'
import { useQuery } from '../../hooks/useQuery.js'
import { useWindow } from '../../hooks/useWindow.js'

export const authTokensField = Component(({ user }) => {
  const state = useLSP()
  const window = useWindow()
  const { query, pushState } = useQuery()

  const [tokens, setTokens] = useState()
  const [tokensLoading, setTokensLoading] = useState(false)
  const [tokensError, setTokensError] = useState(null)

  const [before, setBefore] = useState()
  const [after, setAfter] = useState()

  const [dataReload, setDataReload] = useState(0)
  const reload = useCallback(() => {
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  // Load tokens
  useEffect(() => {
    async function getTokens () {
      setTokensLoading(true)
      setTokensError(null)

      const params = new URLSearchParams(query)

      // Add cursor params if they exist
      if (params.get('before')) params.set('before', before)
      if (params.get('after')) params.set('after', after)

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
  }, [user, state.apiUrl, reload])

  const onPageNav = (ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    window.scrollTo({ top: 0 })
  }

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query)
    beforeParams.set('before', before)
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query)
    afterParams.set('after', after)
    afterParams.delete('before')
  }

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
                    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
                    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
                  </div>

                  ${authTokensTable({ tokens, reload, onDelete: reload })}

                  <div class="bc-pagination-controls">
                    ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
                    ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
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
