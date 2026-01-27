/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useUser } from '../hooks/useUser.js'
import { UsernameField } from './username/username-field.js'
import { PasswordField } from './password/password-field.js'
import { NewsletterField } from './newsletter/newsletter-field.js'
import { EmailField } from './email/email-field.js'
import { DisabledField } from './disabled/disabled-field.js'
import { AuthTokens } from './auth-tokens/auth-tokens-field.js'
import { PasskeysField } from './passkeys/passkeys-field.js'
import { BillingField } from './billing/billing-field.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const { user, reloadUser } = useUser()

  return html`
    <div>
      <dl>
        <${DisabledField} user=${user} />
        <${UsernameField} user=${user} reload=${reloadUser} />
        <${EmailField} user=${user} reload=${reloadUser} />
        <${PasswordField} />
        <${PasskeysField} />
        <${NewsletterField} user=${user} reload=${reloadUser} />
        <${BillingField} />
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

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
