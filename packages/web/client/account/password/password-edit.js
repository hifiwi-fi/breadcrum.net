/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useRef, useCallback } from 'preact/hooks'

/**
 * @typedef {{
 *  onSave?: (formState: { password: string }) => Promise<void> | void,
 *  onCancelEdit?: () => void,
 * }} PasswordEditProps
 */

/**
 * @type {FunctionComponent<PasswordEditProps>}
 */
export const PasswordEdit = ({ onSave, onCancelEdit }) => {
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  const handleSave = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
    if (!form) return

    const passwordElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('password'))
    const confirmPasswordElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('confirmPassword'))
    if (!passwordElement || !confirmPasswordElement) return

    const password = passwordElement.value
    const confirmPassword = confirmPasswordElement.value

    if (password !== confirmPassword) {
      setError(new Error('Passwords do not match'))
      setDisabled(false)
      return
    }

    const formState = {
      password,
    }

    try {
      if (onSave) await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onSave])

  return html`
    <div class='bc-account-password-edit'>
      <form ref="${formRef}" class="bc-account-password-edit-form" id="bc-account-password-edit-form" onsubmit=${handleSave}>
      <fieldset disabled=${disabled}>
        <legend class="bc-account-password-edit-legend">Edit password</legend>
        <div>
          <label class='block'>
            password:
            <input class="block" type="password" minLength="8" maxLength="255" name="password" />
          </label>
          <label class='block'>
            confirm password:
            <input class="block" type="password" minLength="8" maxLength="255" name="confirmPassword" />
          </label>
        </div>
        <div class="bc-account-password-edit-submit-line">
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
