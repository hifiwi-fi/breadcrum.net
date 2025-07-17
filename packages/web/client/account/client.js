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

export const page = Component(() => {
  const window = useWindow()

  const { reload: reloadUser, signal: userReloadSignal } = useReload()

  const { user, loading } = useUser({ reload: userReloadSignal })

  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  return html`
    <div>
      <dl>
        ${user?.disabled
          ? html`
            <dt><marquee direction="right">Account Disabled</marquee></dt>
            <dd>
              <p>Your account has been disabled${user?.disabled_reason ? html`<span> for the following reason:</span>` : html`<span>.</span>`}</p>
              ${user?.disabled_reason
                ? html`<p>${user?.disabled_reason}</p>`
                : null
              }
              <p>Please contact <a href="mailto:support@breadcrum.net">support@breadcrum.net</a> to resolve this issue.</p>
            </dd>
          `
          : null
        }
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
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
