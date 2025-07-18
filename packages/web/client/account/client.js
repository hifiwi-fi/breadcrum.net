/// <reference lib="dom" />
/* eslint-env browser */

// @ts-expect-error
import { Component, html, render, useEffect } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { usernameField } from './username/username-field.js'
import { passwordField } from './password/password-field.js'
import { newsletterField } from './newsletter/newsletter-field.js'
import { emailField } from './email/email-field.js'
import { useReload } from '../hooks/useReload.js'
import { disabledField } from './disabled/disabled-field.js'
import { useAuthTokens } from '../hooks/useAuthTokens.js'

export const page = Component(() => {
  const window = useWindow()

  const { reload: reloadUser, signal: userReloadSignal } = useReload()
  const { user, loading } = useUser({ reload: userReloadSignal })

  useEffect(() => {
    if ((!user && !loading) && window) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  const {
    tokensError,
    tokens,
    // reloadAuthTokens,
    before,
    after,
    beforeParams,
    afterParams
  } = useAuthTokens()

  return html`
    <div>
      <dl>
        ${disabledField({ user })}
        ${usernameField({ user, reload: reloadUser })}
        ${passwordField()}
        ${emailField({ user, reload: reloadUser })}
        ${newsletterField({ user, reload: reloadUser })}
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
      </dl>
      <pre>${JSON.stringify(tokens, null, 2)}</pre>
      <pre>${JSON.stringify(before, null, 2)}</pre>
      <pre>${JSON.stringify(after, null, 2)}</pre>
      <pre>${JSON.stringify(beforeParams, null, 2)}</pre>
      <pre>${JSON.stringify(afterParams, null, 2)}</pre>
      ${tokensError ? html`<pre>${JSON.stringify(tokensError, null, 2)}</pre>` : null}
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
