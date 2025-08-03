/// <reference lib="dom" />

/**
 * @import { TypeAuthTokenReadClient } from '../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js';
 */

// @ts-expect-error
import { useEffect, useState } from 'uland-isomorphic'
import { useUser } from './useUser.js'
import { useQuery } from './useQuery.js'
import { useLSP } from './useLSP.js'
import { useReload } from './useReload.js'

export function useAuthTokens () {
  const { user } = useUser()
  const state = useLSP()
  const { query } = useQuery()

  /** @type {[TypeAuthTokenReadClient[] | null, (authTokens: TypeAuthTokenReadClient[] | null) => void]} */
  const [tokens, setTokens] = useState()
  /** @type {[boolean, (loading: boolean) => void]} */
  const [tokensLoading, setTokensLoading] = useState(false)
  /** @type {[Error | null, (err: Error | null) => void]} */
  const [tokensError, setTokensError] = useState(null)

  /** @type {[string | null, (before: string | null) => void]} */
  const [before, setBefore] = useState()
  /** @type {[string | null, (after: string | null) => void]} */
  const [after, setAfter] = useState()

  const { reload: reloadAuthTokens, signal: authTokensReloadSignal } = useReload()

  // Load auth-tokens
  useEffect(() => {
    async function getAuthTokens () {
      setTokensLoading(true)
      setTokensError(null)
      const params = new URLSearchParams(query ?? '')

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

        if (body?.pagination?.top) {
          const newParams = new URLSearchParams(query ?? '')
          let modified = false
          if (newParams.get('before')) {
            newParams.delete('before')
            modified = true
          }
          if (newParams.get('after')) {
            newParams.delete('after')
            modified = true
          }

          if (modified) {
            const qs = newParams.toString()
            window?.history.replaceState(null, '', qs ? `.?${qs}` : '.')
          }
        }
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getAuthTokens()
        .then(() => { console.log('tokens loaded') })
        .catch(err => { console.error(err); setTokensError(err) })
        .finally(() => { setTokensLoading(false) })
    }
  }, [query, state.apiUrl, authTokensReloadSignal])

  let beforeParams
  if (before) {
    beforeParams = new URLSearchParams(query ?? '')
    beforeParams.set('before', before)
    beforeParams.delete('after')
  }

  let afterParams
  if (after) {
    afterParams = new URLSearchParams(query ?? '')
    afterParams.set('after', after)
    afterParams.delete('before')
  }

  return {
    tokensLoading,
    tokensError,
    tokens,
    reloadAuthTokens,
    before,
    after,
    beforeParams,
    afterParams
  }
}
