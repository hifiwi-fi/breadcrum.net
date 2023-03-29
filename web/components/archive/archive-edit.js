/* eslint-env browser */
/* eslint-disable camelcase */
import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'
export const archiveEdit = Component(({
  archive: ar,
  onSave,
  onDeleteArchive,
  onCancelEdit,
  legend
} = {}) => {
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  const handleInitiateDelete = useCallback((ev) => {
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  const hanldeCancelDelete = useCallback((ev) => {
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  const handleDeleteArchive = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      await onDeleteArchive()
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, onDeleteArchive])

  const handleSave = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current
    // const url = form.url.value
    const title = form.title.value

    const formState = {
      title
    }

    try {
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, formRef?.current, onSave])

  // Parent can delay passing a bookmark to disable the form.
  const initializing = ar == null

  return html`
    <div class='bc-archive-edit'>
      <form ref="${formRef}" class="add-archive-form" id="add-archive-form" onsubmit=${handleSave}>
        <fieldset ?disabled=${disabled || initializing}>
          ${legend ? html`<legend class="bc-archive-legend">${legend}</legend>` : null}
          <div>
            <label class='block'>
              url:
              <input disabled class='block bc-archive-url-edit' type="url" name="url" value="${ar?.url}"/>
            </labe>
          </div>
          <div>
            <label class="block">
              title:
              <input class="block" type="text" name="title" value="${ar?.title}">
            </label>
          </div>

          <div class="bc-archive-edit-submit-line">
            <div class="button-cluster">
              ${onSave ? html`<input name="submit-button" type="submit">` : null}
              ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
            </div>
            <div>
              ${onDeleteArchive
                ? deleteConfirm
                  ? html`
                    <button onClick=${hanldeCancelDelete}>Cancel</button>
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
})
