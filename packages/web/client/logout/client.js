/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useEffect } from 'preact/hooks'
import { useQueryClient } from '@tanstack/preact-query'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'
import { mountPage } from '../lib/mount-page.js'
import { clearOfflineData } from '../lib/offline/offline-cleanup.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const queryClient = useQueryClient()
  const { user } = useUser({ required: false })

  useEffect(() => {
    const logout = async () => {
      const userId = state.user?.id ?? user?.id ?? null

      try {
        await fetch(`${state.apiUrl}/logout`, {
          method: 'post',
        })
      } finally {
        await clearOfflineData({
          apiUrl: state.apiUrl,
          userId,
          queryClient,
        })
        queryClient.clear()
        queryClient.setQueryData(['user', state.apiUrl], null)
        state.user = null
        window.location.replace('/')
      }
    }

    logout().catch(err => {
      console.error(err)
    })
  }, [])

  return html`
    ${!user
      ? html`
        <div>
          Logged out
        </div>
      `
      : html`
        <div>
          Logging out of ${user.username}
        </div>
      `
    }
`
}

mountPage(Page)
