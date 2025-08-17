/// <reference lib="dom" />
/* eslint-env browser */

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useRef, useCallback } from 'preact/hooks'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 *  onSave?: (formState: { username: string }) => Promise<void> | void,
 *  onCancelEdit?: () => void,
 * }} UsernameEditProps
 */

/**
 * @type {FunctionComponent<UsernameEditProps>}
 */
export const UsernameEdit = ({ user, onSave, onCancelEdit }) => {
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  const handleSave = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
    if (!form) return

    const usernameElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('username'))
    if (!usernameElement) return
    const username = usernameElement.value

    const formState = {
      username,
    }

    try {
      if (onSave) await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onSave])

  return html`
    <div class='bc-account-username-edit'>
      <form ref="${formRef}" class="bc-account-username-edit-form" id="bc-account-username-edit-form" onsubmit=${handleSave}>
      <fieldset disabled=${disabled}>
        <legend class="bc-account-username-edit-legend">Edit username</legend>
      <div>
          <label class='block'>
            username:
            <input class='block' pattern="^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$" minLength="1" maxLength="50" type="text" name="username" value="${user?.username}" autoCorrect="off" autoCapitalize="off" spellCheck="false"/>
          </label>
        </div>
        <div class="bc-account-username-edit-submit-line">
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
