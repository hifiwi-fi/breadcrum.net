/// <reference lib="dom" />

/**
 * @import { FunctionComponent, ComponentChild } from 'preact'
 * @import { TypeAuthTokenReadClient } from '../../../api/user/auth-tokens/schemas/schema-auth-token-read.js'
 * @import { TypeAuthTokenUpdate } from '../../../api/user/auth-tokens/schemas/schema-auth-token-update.js'
 */

import { html } from 'htm/preact'
import { useRef, useState, useCallback } from 'preact/hooks'

/**
 * @typedef {object} AuthTokenEditProps
 * @property {TypeAuthTokenReadClient} [authToken]
 * @property {(newAuthToken: TypeAuthTokenUpdate) => Promise<void>} [onSave]
 * @property {() => Promise<void>} [onDeleteAuthToken]
 * @property {() => void} [onCancelEdit]
 * @property {string | ComponentChild} [legend]
 */

/**
 * @type {FunctionComponent<AuthTokenEditProps>}
 */
export const AuthTokenEdit = ({
  authToken: t,
  onSave,
  onDeleteAuthToken,
  onCancelEdit,
  legend
}) => {
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [deleteConfirm, setDeleteConfirm] = useState(false)
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

  /** @type {(ev: Event) => Promise<void>} */
  const handleDeleteAuthToken = useCallback(async (/** @type{Event} */ ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      if (onDeleteAuthToken) await onDeleteAuthToken()
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onDeleteAuthToken])

  /**
   * @type {(ev: SubmitEvent) => Promise<void>}
   */
  const handleSave = useCallback(async (/** @type{SubmitEvent} */ ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
    if (!form) return

    const noteElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('note'))
    const protectElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('protect'))

    if (!noteElement || !protectElement) return

    const formState = {
      note: noteElement.value,
      protect: protectElement.checked
    }

    try {
      if (onSave) await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onSave])

  return html`
    <div class='bc-auth-token-edit'>
      <form ref=${formRef} class="edit-auth-token-form" id="edit-auth-token-form" onsubmit=${handleSave}>
        <fieldset disabled=${disabled}>
          ${legend
? html`<legend class="bc-auth-token-legend">${
            typeof legend === 'string'
              ? legend
              : legend
          }</legend>`
: null}
          <div>
            <label class='block'>
              note:
              <input class='block bc-auth-token-note-edit' type="text" name="note" defaultValue="${t?.note}"/>
            </label>
            <span class="bc-help-text">
              Auth token notes let you add a human readable label to remember where they are used.
            </span>
          </div>
          <div>
            <label>
              protect:
              <input class='protect-checkbox' type="checkbox" name="protect" checked="${t?.protect}" />
            </label>
            <span class="bc-help-text">
              Protected tokens will not be deleted in bulk cleanup operations.
            </span>
          </div>

          <div class="bc-auth-token-edit-submit-line">
            <div class="button-cluster">
              ${onSave ? html`<span><input name="submit-button" type="submit" /></span>` : null}
              ${onCancelEdit ? html`<span><button type="button" onClick="${onCancelEdit}">Cancel</button></span>` : null}
            </div>
            <div class="button-cluster">
              ${onDeleteAuthToken
                ? html`${deleteConfirm
                    ? html`
                          <span><button type="button" onClick="${handleCancelDelete}">Cancel</button></span>
                          <span><button type="button" onClick="${handleDeleteAuthToken}">Destroy</button></span>`
                    : html`
                      <span><button type="button" disabled="${t?.is_current}" onClick="${handleInitiateDelete}">Delete</button></span>`}
                  `
                : null
              }
            </div>
          </div>
          ${error ? html`<div class="error-box">${error?.message}</div>` : null}
        </fieldset>
      </form>
    </div>
    `
}
