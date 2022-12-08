/* eslint-env browser */
import { Component, html, render, useEffect, useState, useCallback } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useLSP } from '../hooks/useLSP.js'
import { usernameField } from './username/username-field.js'

export const page = Component(() => {
  const state = useLSP()
  const window = useWindow()

  const [dataReload, setDataReload] = useState(0)
  const reload = useCallback(() => {
    setDataReload(dataReload + 1)
  }, [dataReload, setDataReload])

  const { user, loading } = useUser({ reload: dataReload })

  const [requestingEmailVerification, setRequestingEmailVerification] = useState(false)
  const [emailVerificationRequested, setEmailVerificationRequested] = useState(false)

  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user, loading])

  const handleClick = async (ev) => {
    ev.preventDefault()
    setRequestingEmailVerification(true)

    try {
      const response = await fetch(`${state.apiUrl}/user/email:confirm`, {
        method: 'post'
      })

      if (response.ok && response.status === 202) {
        await response.json()
        console.log('Email verification requested')
        setEmailVerificationRequested(true)
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.log(err)
    } finally {
      setRequestingEmailVerification(false)
    }

    fetch('')
  }

  return html`
    <div>
      <dl>
        ${usernameField({ user, reload })}
        <dt>email${!loading && user?.email_confirmed === false ? html`<span> (unconfirmed)</span>` : null}</dt>
        <dd>${user?.email}${!loading && user?.email_confirmed === false ? html`<button ?disabled=${requestingEmailVerification || emailVerificationRequested} onclick=${handleClick}>${emailVerificationRequested ? 'Email verification sent' : 'Send confirmation email'}</button>` : null}</dd>
        <dt>created at</dt>
        <dd><time datetime="${user?.created_at}">${user?.created_at ? (new Date(user.created_at)).toLocaleDateString() : null}</time></dd>
        <dt>updated at</dt>
        <dd><time datetime="${user?.updated_at}">${user?.updated_at ? (new Date(user.updated_at)).toLocaleDateString() : null}</time></dd>
        <dt>id</dt>
        <dd><code>${user?.id}</code></dd>
     </dl>
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
