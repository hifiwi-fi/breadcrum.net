/// <reference lib="dom" />

/**
 * @import { TypePasskeyReadClient } from '../../api/user/passkeys/schemas/schema-passkey-read.js'
 */

import { useEffect, useState, useCallback } from 'preact/hooks'
import { useUser } from './useUser.js'
import { useLSP } from './useLSP.js'
import { useReload } from './useReload.js'
import { client } from '@passwordless-id/webauthn/dist/esm/index.js'

export function usePasskeys () {
  const { user } = useUser({ required: false })
  const state = useLSP()

  const [passkeys, setPasskeys] = useState(/** @type {TypePasskeyReadClient[] | null} */(null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {Error | null} */(null))

  const { reload: reloadPasskeys, signal: passkeysReloadSignal } = useReload()

  // Load passkeys
  useEffect(() => {
    async function getPasskeys () {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${state.apiUrl}/user/passkeys`, {
          method: 'GET',
          headers: {
            accept: 'application/json'
          }
        })

        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const body = await response.json()
          setPasskeys(body)
        } else {
          throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
        }
      } catch (err) {
        console.error('Failed to load passkeys:', err)
        setError(/** @type {Error} */(err))
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      getPasskeys()
    }
  }, [user?.id, state.apiUrl, passkeysReloadSignal])

  /**
   * Register a new passkey
   * @param {string} name - Name for the passkey
   * @returns {Promise<void>}
   */
  const registerPasskey = useCallback(async (/** @type {string} */ name) => {
    try {
      // I don think we actually need this:
      // Dynamic import to avoid loading WebAuthn library unless needed
      // const { client } = await import('@passwordless-id/webauthn/dist/esm/index.js')

      // Check if WebAuthn is available
      const isAvailable = client.isAvailable()
      if (!isAvailable) {
        throw new Error('WebAuthn is not available in this browser')
      }

      // Get challenge from server
      const challengeResponse = await fetch(`${state.apiUrl}/user/passkeys/register/challenge`, {
        method: 'POST'
      })

      if (!challengeResponse.ok) {
        throw new Error(`Failed to get challenge: ${challengeResponse.status} ${challengeResponse.statusText}`)
      }

      const { challenge } = await challengeResponse.json()

      // Register with authenticator
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

      // Verify registration with server
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

      // Reload passkeys list
      reloadPasskeys()
    } catch (err) {
      console.error('Failed to register passkey:', err)
      throw err
    }
  }, [state.apiUrl, user?.username, reloadPasskeys])

  /**
   * Update a passkey's name
   * @param {string} id - Passkey ID
   * @param {string} name - New name
   * @returns {Promise<void>}
   */
  const updatePasskey = useCallback(async (/** @type {string} */ id, /** @type {string} */ name) => {
    try {
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

      // Reload passkeys list
      reloadPasskeys()
    } catch (err) {
      console.error('Failed to update passkey:', err)
      throw err
    }
  }, [state.apiUrl, reloadPasskeys])

  /**
   * Delete a passkey
   * @param {string} id - Passkey ID
   * @returns {Promise<void>}
   */
  const deletePasskey = useCallback(async (/** @type {string} */ id) => {
    try {
      const response = await fetch(`${state.apiUrl}/user/passkeys/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete passkey: ${response.status} ${response.statusText} - ${errorText}`)
      }

      // Reload passkeys list
      reloadPasskeys()
    } catch (err) {
      console.error('Failed to delete passkey:', err)
      throw err
    }
  }, [state.apiUrl, reloadPasskeys])

  return {
    passkeys,
    loading,
    error,
    registerPasskey,
    updatePasskey,
    deletePasskey,
    reloadPasskeys
  }
}
