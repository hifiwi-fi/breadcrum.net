/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js'
 */
// @ts-expect-error
import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'

/**
 * @typedef {({
 *  user,
 *  onSave,
 *  onCancelEdit,
 * }: {
 *  user: TypeUserRead | null,
 *  onSave?: (formState: { email: string }) => Promise<void> | void,
 *  onCancelEdit?: () => void,
 * }) => any} EmailEdit
 */

/**
 * @type {EmailEdit}
 */
export const emailEdit = Component(/** @type{EmailEdit} */({ user, onSave, onCancelEdit }) => {
  const [error, setError] = useState(null)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  const handleSave = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current
    const email = form.email.value

    if (email === user?.email) {
      setError(new Error('New email must be different than current email'))
      setDisabled(false)
      return
    }

    const formState = {
      email,
    }

    try {
      await onSave?.(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [user?.email, setDisabled, setError, formRef?.current, onSave])

  return html`
    <div class='bc-account-email-edit'>
      <form ref="${formRef}" class="bc-account-email-edit-form" id="bc-account-email-edit-form" onsubmit=${handleSave}>
      <fieldset ?disabled=${disabled}>
        <legend class="bc-account-email-edit-legend">Edit email</legend>
        <div>
          <label class='block'>
            email:
            <input class='block' minlength="1" maxlength="200" type="email" name="email" value="${user?.email}"/>
          </label>
        </div>
        <div class="bc-account-email-edit-submit-line">
          <div class="button-cluster">
            ${onSave ? html`<input name="submit-button" type="submit">` : null}
            ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
          </div>
        </div>
        ${error ? html`<div class="error-box">${error.message}</div>` : null}
      </fieldset>
    </form>
    </div>
  `
})
