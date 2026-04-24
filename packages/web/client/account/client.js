/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeUserRead } from '../../routes/api/user/schemas/schema-user-read.js'
 */

import { html } from 'htm/preact'
import { useCallback, useMemo } from 'preact/hooks'
import { useQueryClient } from '@tanstack/preact-query'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'
import { UsernameField } from './username/username-field.js'
import { PasswordField } from './password/password-field.js'
import { NewsletterField } from './newsletter/newsletter-field.js'
import { EmailField } from './email/email-field.js'
import { DisabledField } from './disabled/disabled-field.js'
import { AuthTokens } from './auth-tokens/auth-tokens-field.js'
import { PasskeysField } from './passkeys/passkeys-field.js'
import { mountPage } from '../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const { user } = useUser()
  const state = useLSP()
  const queryClient = useQueryClient()

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

  return html`
    <div>
      <dl>
        <${DisabledField} user=${user} />
        <${UsernameField}
          user=${user}
          onSuccess=${handleUsernameSuccess}
        />
        <${EmailField}
          user=${user}
          onSuccess=${handleEmailSuccess}
        />
        <${PasswordField} />
        <${PasskeysField} />
        <${NewsletterField}
          user=${user}
          onSuccess=${handleNewsletterSuccess}
        />
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
        <${AuthTokens} />
      </dl>
    </div>
`
}

mountPage(Page)
