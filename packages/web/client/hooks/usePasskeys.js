/// <reference lib="dom" />

/**
 * @import { TypePasskeyReadClient } from '../../routes/api/user/passkeys/schemas/schema-passkey-read.js'
 */

import { useCallback } from 'preact/hooks'
import { useQuery as useTanstackQuery, useMutation, useQueryClient } from '@tanstack/preact-query'
import { useUser } from './useUser.js'
import { useLSP } from './useLSP.js'
import { client } from '@passwordless-id/webauthn/dist/esm/index.js'

export function usePasskeys () {
  const { user } = useUser({ required: false })
  const state = useLSP()
  const queryClient = useQueryClient()

  const passkeysQuery = useTanstackQuery({
    queryKey: ['passkeys', user?.id ?? null, state.apiUrl],
    enabled: Boolean(user),
    queryFn: async ({ signal }) => {
      const response = await fetch(`${state.apiUrl}/user/passkeys`, {
        method: 'GET',
        headers: {
          accept: 'application/json'
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        return /** @type {TypePasskeyReadClient[]} */ (await response.json())
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
  })

  const invalidatePasskeys = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['passkeys'] })
  }, [queryClient])

  const registerMutation = useMutation({
    mutationFn: async (/** @type {string} */ name) => {
      const isAvailable = client.isAvailable()
      if (!isAvailable) {
        throw new Error('WebAuthn is not available in this browser')
      }

      const challengeResponse = await fetch(`${state.apiUrl}/user/passkeys/register/challenge`, {
        method: 'POST'
      })

      if (!challengeResponse.ok) {
        throw new Error(`Failed to get challenge: ${challengeResponse.status} ${challengeResponse.statusText}`)
      }

      const { challenge } = await challengeResponse.json()

      if (!user?.username) {
        throw new Error('Username required to register a passkey')
      }

      const registration = await client.register({
        user: {
          id: user.id,
          name: user.username,
          displayName: user.username,
        },
        challenge,
        userVerification: 'required',
        timeout: 60000,
        attestation: false
      })

      const verifyResponse = await fetch(`${state.apiUrl}/user/passkeys/register/verify`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          registration: {
            ...registration,
            challenge
          },
          name
        })
      })

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text()
        throw new Error(`Failed to verify registration: ${verifyResponse.status} ${verifyResponse.statusText} - ${errorText}`)
      }
    },
    onSuccess: invalidatePasskeys,
    onError: (/** @type {Error} */ err) => {
      console.error('Failed to register passkey:', err)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (/** @type {{ id: string, name: string }} */ { id, name }) => {
      const response = await fetch(`${state.apiUrl}/user/passkeys/${id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update passkey: ${response.status} ${response.statusText} - ${errorText}`)
      }
    },
    onSuccess: invalidatePasskeys,
    onError: (/** @type {Error} */ err) => {
      console.error('Failed to update passkey:', err)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (/** @type {string} */ id) => {
      const response = await fetch(`${state.apiUrl}/user/passkeys/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete passkey: ${response.status} ${response.statusText} - ${errorText}`)
      }
    },
    onSuccess: invalidatePasskeys,
    onError: (/** @type {Error} */ err) => {
      console.error('Failed to delete passkey:', err)
    },
  })

  /**
   * Register a new passkey
   * @param {string} name - Name for the passkey
   * @returns {Promise<void>}
   */
  const registerPasskey = useCallback(async (/** @type {string} */ name) => {
    await registerMutation.mutateAsync(name)
  }, [registerMutation])

  /**
   * Update a passkey's name
   * @param {string} id - Passkey ID
   * @param {string} name - New name
   * @returns {Promise<void>}
   */
  const updatePasskey = useCallback(async (/** @type {string} */ id, /** @type {string} */ name) => {
    await updateMutation.mutateAsync({ id, name })
  }, [updateMutation])

  /**
   * Delete a passkey
   * @param {string} id - Passkey ID
   * @returns {Promise<void>}
   */
  const deletePasskey = useCallback(async (/** @type {string} */ id) => {
    await deleteMutation.mutateAsync(id)
  }, [deleteMutation])

  return {
    passkeys: passkeysQuery.data ?? null,
    loading: passkeysQuery.isPending,
    error: passkeysQuery.error || null,
    registerPasskey,
    updatePasskey,
    deletePasskey,
    reloadPasskeys: invalidatePasskeys,
  }
}
