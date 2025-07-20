/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js'
 */
// @ts-expect-error
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'

/**
 * @typedef {({
 *  user,
 *  onEdit,
 *  reload,
 * }: {
 *  user: TypeUserRead | null,
 *  onEdit?: () => void,
 *  reload: () => void,
 * }) => any} EmailView
 */

/**
 * @type {EmailView}
 */
export const emailView = Component(/** @type{EmailView} */({ user, onEdit, reload }) => {
  const state = useLSP()
  const [error, setError] = useState(null)

  const [requestingEmailVerification, setRequestingEmailVerification] = useState(false)
  const [emailVerificationRequested, setEmailVerificationRequested] = useState(false)

  const [requestingEmailUpdateVerification, setRequestingEmailUpdateVerification] = useState(false)
  const [emailUpdateVerificationRequested, setEmailUpdateVerificationRequested] = useState(false)
  const [cancellingEmailUpdate, setCancellingEmailUpdate] = useState(false)

  const handleEmailConfirmRequest = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setRequestingEmailVerification(true)
    setError(null)

    try {
      const response = await fetch(`${state.apiUrl}/user/email:resend`, {
        method: 'post',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ update: false }),
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
  }, [state.apiUrl, setRequestingEmailVerification, setError, setEmailVerificationRequested])

  const handleEmailUpdateConfirmRequest = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setRequestingEmailUpdateVerification(true)
    setError(null)

    try {
      const response = await fetch(`${state.apiUrl}/user/email:resend`, {
        method: 'post',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ update: true }),
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
  }, [state.apiUrl, setRequestingEmailUpdateVerification, setError, setEmailUpdateVerificationRequested])

  const handleCancelEmailUpdate = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setCancellingEmailUpdate(true)
    setError(null)

    try {
      const response = await fetch(`${state.apiUrl}/user/email`, {
        method: 'delete',
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
  }, [state.apiUrl, setCancellingEmailUpdate, setError, reload])

  return html`
    <dt>email ${user?.email_confirmed === false ? html`<span> (unconfirmed)</span>` : null}</dt>
    <dd>
      ${user?.email}
      ${!user?.pending_email_update ? html`<button onClick=${onEdit}>Edit</button>` : null}
      ${user?.email_confirmed === false && !user?.pending_email_update
        ? html`<div><button
          onclick="${handleEmailConfirmRequest}"
          ?disabled="${requestingEmailVerification || emailVerificationRequested || user?.disabled_email}">
          ${
            emailVerificationRequested
              ? 'Email verification resent'
              : 'Resend email confirmation'
          }</button></div>`
        : null}
      ${user?.disabled_email
      ? html`<div>This email is disabled due to delivery issues. Please reach out to support@breadcrum.net for further help, or update to a new email address.</div>`
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
