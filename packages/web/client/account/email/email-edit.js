/// <reference lib="dom" />

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useRef, useCallback } from 'preact/hooks'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 *  onSave?: (formState: { email: string }) => Promise<void> | void,
 *  onCancelEdit?: () => void,
 * }} EmailEditProps
 */

/**
 * @type {FunctionComponent<EmailEditProps>}
 */
export const EmailEdit = ({ user, onSave, onCancelEdit }) => {
  const [error, setError] = useState(/** @type { Error | null } */(null))
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  const handleSave = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
    if (!form) return

    const emailElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('email'))
    if (!emailElement) return
    const email = emailElement.value

    if (email === user?.email) {
      setError(new Error('New email must be different than current email'))
      setDisabled(false)
      return
    }

    const formState = {
      email,
    }

    try {
      if (onSave) await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [user?.email, setDisabled, setError, onSave])

  return html`
    <div class='bc-account-email-edit'>
      <form ref=${formRef} class="bc-account-email-edit-form" id="bc-account-email-edit-form" onsubmit=${handleSave}>
      <fieldset disabled=${disabled}>
        <legend class="bc-account-email-edit-legend">Edit email</legend>
        <div>
          <label class='block'>
            email:
            <!-- Keep email rules in sync with /openapi and /docs/account/ -->
            <input class='block' minLength="1" maxLength="200" type="email" name="email" defaultValue="${user?.email}"/>
          </label>
        </div>
        <div class="bc-account-email-edit-submit-line">
          <div class="button-cluster">
            ${onSave ? html`<input name="submit-button" type="submit" />` : null}
            ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
          </div>
        </div>
        ${error ? html`<div class="error-box">${error.message}</div>` : null}
      </fieldset>
    </form>
    </div>
  `
}
