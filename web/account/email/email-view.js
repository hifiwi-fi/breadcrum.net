import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'

export const emailView = Component(({ user, onEdit, reload }) => {
  const state = useLSP()
  const [error, setError] = useState(null)

  const [requestingEmailVerification, setRequestingEmailVerification] = useState(false)
  const [emailVerificationRequested, setEmailVerificationRequested] = useState(false)

  const [requestingEmailUpdateVerification, setRequestingEmailUpdateVerification] = useState(false)
  const [emailUpdateVerificationRequested, setEmailUpdateVerificationRequested] = useState(false)
  const [cancellingEmailUpdate, setCancellingEmailUpdate] = useState(false)

  const handleEmailConfirmRequest = useCallback(async (ev) => {
    ev.preventDefault()
    setRequestingEmailVerification(true)
    setError(null)

    try {
      const response = await fetch(`${state.apiUrl}/user/email:resend`, {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ update: false })
      })

      if (response.ok && response.status === 202) {
        await response.json()
        console.log('Email verification requested')
        setEmailVerificationRequested(true)
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      setError(err)
    } finally {
      setRequestingEmailVerification(false)
    }
  }, [state.apiUrl])

  const handleEmailUpdateConfirmRequest = useCallback(async (ev) => {
    ev.preventDefault()
    setRequestingEmailUpdateVerification(true)
    setError(null)

    try {
      const response = await fetch(`${state.apiUrl}/user/email:resend`, {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ update: true })
      })

      if (response.ok && response.status === 202) {
        await response.json()
        console.log('Email verification requested')
        setEmailUpdateVerificationRequested(true)
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      setError(err)
    } finally {
      setRequestingEmailUpdateVerification(false)
    }
  }, [state.apiUrl])

  const handleCancelEmailUpdate = useCallback(async (ev) => {
    ev.preventDefault()
    setCancellingEmailUpdate(true)
    setError(null)

    try {
      const response = await fetch(`${state.apiUrl}/user/email`, {
        method: 'delete'
      })

      if (response.ok && response.status === 204) {
        console.log('Email update deleted')
        reload()
      } else {
        console.log(response)
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.error(err)
      setError(err)
      setCancellingEmailUpdate(false)
    }
  })

  return html`
    <dt>email ${user?.email_confirmed === false ? html`<span> (unconfirmed)</span>` : null}</dt>
    <dd>
      ${user?.email}
      <button onClick=${onEdit}>Edit</button>
      ${user?.email_confirmed === false
        ? html`<div><button
          onclick="${handleEmailConfirmRequest}"
          ?disabled="${requestingEmailVerification || emailVerificationRequested}">${
            emailVerificationRequested
              ? 'Email verification resent'
              : 'Resend email confirmation'
          }</button></div>`
        : null}
      ${user?.pending_email_update
      ? html`
      <div>
        ${user?.pending_email_update} (update pending verification)
        <div>
        <button
          onclick="${handleEmailUpdateConfirmRequest}"
          ?disabled="${requestingEmailUpdateVerification || emailUpdateVerificationRequested}">${
            emailUpdateVerificationRequested
              ? 'Email update verification resent'
              : 'Resend email update confirmation'
          }</button>
        <button
          onclick="${handleCancelEmailUpdate}"
          ?disabled="${cancellingEmailUpdate}"
        >
          ${cancellingEmailUpdate ? 'Cancelling email update' : 'Cancel email update'}
        </button>
        </div>
      </div>
      `
      : null
    }
      ${error ? html`<div class="error-box">${error.message}</div>` : null}
    </dd>
  `
})
