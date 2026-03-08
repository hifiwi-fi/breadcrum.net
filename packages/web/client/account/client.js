/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
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

  const userQueryKey = ['user', state.apiUrl]

  return html`
    <div>
      <dl>
        <${DisabledField} user=${user} />
        <${UsernameField}
          user=${user}
          onSuccess=${(result) => queryClient.setQueryData(userQueryKey, result.data)}
        />
        <${EmailField}
          user=${user}
          onSuccess=${() => queryClient.invalidateQueries({ queryKey: userQueryKey })}
        />
        <${PasswordField} />
        <${PasskeysField} />
        <${NewsletterField}
          user=${user}
          onSuccess=${() => queryClient.invalidateQueries({ queryKey: userQueryKey })}
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
