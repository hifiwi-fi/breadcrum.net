/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent, ComponentChild, JSX } from 'preact'
 * @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js'
 */

/**
 * @typedef {object} ArchiveFormState
 * @property {string} title
 */

import { html } from 'htm/preact'
import { useState, useRef, useCallback } from 'preact/hooks'

/** @type {FunctionComponent<{
 * archive?: TypeArchiveReadClient,
 * onSave?: (formState: ArchiveFormState) => Promise<void>,
 * onDeleteArchive?: () => Promise<void>,
 * onCancelEdit?: () => void,
 * legend?: string | ComponentChild
}>} */
export const ArchiveEdit = ({
  archive: ar,
  onSave,
  onDeleteArchive,
  onCancelEdit,
  legend,
} = {}) => {
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  const handleInitiateDelete = useCallback(() => {
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  const handleDeleteArchive = useCallback(/** @param {JSX.TargetedEvent} ev */ async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      if (onDeleteArchive) await onDeleteArchive()
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onDeleteArchive])

  const handleSave = useCallback(/** @param {JSX.TargetedEvent} ev */ async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
    if (!form) return

    // const url = form.url.value
    const titleElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('title'))
    if (!titleElement) return
    const title = titleElement.value

    const formState = {
      title,
    }

    try {
      if (onSave) await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, formRef?.current, onSave])

  // Parent can delay passing a bookmark to disable the form.
  const initializing = ar == null

  return html`
    <div class='bc-archive-edit'>
      <form ref="${formRef}" class="add-archive-form" id="add-archive-form" onsubmit=${handleSave}>
        <fieldset disabled=${disabled || initializing}>
          ${legend ? html`<legend class="bc-archive-legend">${legend}</legend>` : null}
          <div>
            <label class='block'>
              url:
              <input disabled class='block bc-archive-url-edit' type="url" name="url" value="${ar?.url}"/>
            </label>
          </div>
          <div>
            <label class="block">
              title:
              <input class="block" type="text" name="title" value="${ar?.title}" />
            </label>
          </div>

          <div class="bc-archive-edit-submit-line">
            <div class="button-cluster">
              ${onSave ? html`<input name="submit-button" type="submit" />` : null}
              ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
            </div>
            <div>
              ${onDeleteArchive
                ? deleteConfirm
                  ? html`
                    <button onClick=${handleCancelDelete}>Cancel</button>
                    <button onClick=${handleDeleteArchive}>Destroy</button>`
                  : html`<button onClick=${handleInitiateDelete}>Delete</button>`
                : null
              }
            </div>
          </div>
          ${error ? html`<div class="error-box">${error.message}</div>` : null}
        </fieldset>
      </form>
    </div>
  `
}
