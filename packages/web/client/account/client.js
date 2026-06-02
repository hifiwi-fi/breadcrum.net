/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeUserRead } from '../../routes/api/user/schemas/schema-user-read.js'
 */

import { html } from 'htm/preact'
import { useCallback, useMemo, useState } from 'preact/hooks'
import { useQueryClient } from '@tanstack/preact-query'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'
import { useOnlineStatus } from '../hooks/useOnlineStatus.js'
import { UsernameField } from './username/username-field.js'
import { PasswordField } from './password/password-field.js'
import { NewsletterField } from './newsletter/newsletter-field.js'
import { EmailField } from './email/email-field.js'
import { DisabledField } from './disabled/disabled-field.js'
import { AuthTokens } from './auth-tokens/auth-tokens-field.js'
import { PasskeysField } from './passkeys/passkeys-field.js'
import { mountPage } from '../lib/mount-page.js'
import { clearOfflineData } from '../lib/offline/offline-cleanup.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const { user } = useUser()
  const state = useLSP()
  const online = useOnlineStatus()
  const queryClient = useQueryClient()
  const [clearingOfflineData, setClearingOfflineData] = useState(false)
  const [offlineDataMessage, setOfflineDataMessage] = useState('')

  const userQueryKey = useMemo(() => ['user', state.apiUrl], [state.apiUrl])

  const handleUsernameSuccess = useCallback((/** @type {{ data: TypeUserRead }} */ result) => {
    queryClient.setQueryData(userQueryKey, result.data)
  }, [queryClient, userQueryKey])

  const handleEmailSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: userQueryKey })
  }, [queryClient, userQueryKey])

  const handleNewsletterSuccess = useCallback((/** @type {{ data: TypeUserRead }} */ result) => {
    queryClient.setQueryData(userQueryKey, result.data)
  }, [queryClient, userQueryKey])

  const handleClearOfflineData = useCallback(async () => {
    if (!user) return

    if (
      typeof window !== 'undefined' &&
      !window.confirm('Clear offline data for this account on this device?')
    ) {
      return
    }

    setClearingOfflineData(true)
    setOfflineDataMessage('')

    try {
      const result = await clearOfflineData({
        apiUrl: state.apiUrl,
        userId: user.id,
        queryClient,
      })

      setOfflineDataMessage(result.persistentDataDeleted
        ? 'Offline data cleared.'
        : 'Offline cache cleared.')
    } catch (err) {
      console.error('Failed to clear offline data:', err)
      setOfflineDataMessage('Offline data could not be cleared.')
    } finally {
      setClearingOfflineData(false)
    }
  }, [queryClient, state.apiUrl, user])

  return html`
    <div>
      <dl>
        <${DisabledField} user=${user} />
          <${UsernameField}
            user=${user}
            onSuccess=${handleUsernameSuccess}
            disabled=${!online}
          />
          <${EmailField}
            user=${user}
            onSuccess=${handleEmailSuccess}
            disabled=${!online}
          />
          <${PasswordField} disabled=${!online} />
          <${PasskeysField} disabled=${!online} />
          <${NewsletterField}
            user=${user}
            onSuccess=${handleNewsletterSuccess}
            disabled=${!online}
          />
        <dt>offline data</dt>
        <dd class="bc-account-offline-data">
          <button
            type="button"
            onClick=${handleClearOfflineData}
            disabled=${!user || clearingOfflineData}
          >
            ${clearingOfflineData ? 'Clearing...' : 'Clear offline data'}
          </button>
          ${offlineDataMessage ? html`<span>${offlineDataMessage}</span>` : null}
        </dd>
        <dt>created at</dt>
        <dd><time datetime="${user?.created_at}">${user?.created_at ? (new Date(user.created_at)).toLocaleDateString() : null}</time></dd>
        <dt>updated at</dt>
        <dd><time datetime="${user?.updated_at}">${user?.updated_at ? (new Date(user.updated_at)).toLocaleDateString() : null}</time></dd>
        <dt>id</dt>
        <dd><code>${user?.id}</code></dd>
        ${user?.admin
          ? html`
            <dt>admin section</dt>
            <dd><a href="/admin/">Admin panel</a></dd>
          `
          : null
        }
        <${AuthTokens} disabled=${!online} />
      </dl>
    </div>
`
}

mountPage(Page)
