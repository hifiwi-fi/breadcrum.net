/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeAuthTokenRead } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js';
 * @import { TypeAuthTokenUpdate } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-update.js';
*/

// @ts-expect-error
import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'

/**
 * @typedef {({
 *  authToken,
 *  onSave,
 *  onDeleteAuthToken,
 *  onCancelEdit,
 *  legend
 * }: {
 *  authToken: TypeAuthTokenRead,
 *  onSave?: (newAuthToken: TypeAuthTokenUpdate) => Promise<void>,
 *  onDeleteAuthToken?: () => Promise<void>,
 *  onCancelEdit?: () => void,
 *  legend?: any,
 * }) => any} AuthTokenView
 */

/**
  * @type {AuthTokenView}
  */
export const authTokenEdit = Component(/** @type{AuthTokenView} */({
  authToken: t,
  onSave,
  onDeleteAuthToken,
  onCancelEdit,
  legend
}) => {
  /** @type {[Error | null, (err: Error | null) => void]} */
  const [error, setError] = useState(null)
  /** @type {[boolean, (confirm: boolean) => void]} */
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  /** @type {[boolean, (disabled: boolean) => void]} */
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  /** @type {() => void} */
  const handleInitiateDelete = useCallback(() => {
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  /** @type {() => void} */
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  /** @type {() => Promise<void>} */
  const handleDeleteAuthToken = useCallback(async (/** @type{Event} */ ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      await onDeleteAuthToken?.()
    } catch (err) {
      const handledError = err instanceof Error ? err : new Error('Unknown error', { cause: err })
      setDisabled(false)
      setError(handledError)
    }
  }, [setDisabled, setError, onDeleteAuthToken])

  /**
   * @type{ (ev: SubmitEvent) => Promise<void>}
   */
  const handleSave = useCallback(async (/** @type{SubmitEvent} */ ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current
    const note = form.note.value
    const protect = form.protect.checked

    const formState = {
      note,
      protect
    }

    try {
      await onSave?.(formState)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error', { cause: err })
      setDisabled(false)
      setError(error)
    }
  }, [setDisabled, setError, formRef?.current, onSave])

  return html`
    <div class='bc-auth-token-edit'>
      <form ref="${formRef}" class="edit-auth-token-form" id="edit-auth-token-form" onsubmit=${handleSave}>
        <fieldset ?disabled=${disabled}>
          ${legend ? html`<legend class="bc-auth-token-legend">${legend}</legend>` : null}
          <div>
            <label class='block'>
              note:
              <input class='block bc-auth-token-note-edit' type="text" name="note" value="${t.note}"/>
            </label>
          </div>
          <div>
            <label>
              protect:
              <input type="checkbox" name="protect" ?checked="${t.protect}">
            </label>
          </div>

          <div class="bc-auth-token-edit-submit-line">
            <div class="button-cluster">
              ${onSave ? html`<input name="submit-button" type="submit">` : null}
              ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
            </div>
            <div>
              ${onDeleteAuthToken
                ? deleteConfirm
                  ? html`
                    <button onClick=${handleCancelDelete}>Cancel</button>
                    <button onClick=${handleDeleteAuthToken}>Destroy</button>`
                  : html`<button ?disabled=${t.is_current} onClick=${handleInitiateDelete}>Delete</button>`
                : null
              }
            </div>
          </div>
          ${error ? html`<div class="error-box">${error.message}</div>` : null}
        </fieldset>
      </form>
    </div>
    `
})
