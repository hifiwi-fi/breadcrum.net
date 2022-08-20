/* eslint-env browser */
/* eslint-disable camelcase */
import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'
export const feedEdit = Component(({
  feed: f,
  onSave,
  onDeleteFeed,
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

  const handleDeleteFeed = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      await onDeleteFeed()
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, onDeleteFeed])

  const handleSave = useCallback(async (ev) => {
    // TODO  this is the bookmark impl
  }, [setDisabled, setError, formRef?.current, onSave])

  // Parent can delay passing a bookmark to disable the form.
  const initializing = f == null

  return html`
    <div class='bc-feed-edit'>
      <form ref="${formRef}" class="add-feed-form" id="add-feed-form" onsubmit=${handleSave}>
        <fieldset ?disabled=${disabled || initializing}>
          ${legend ? html`<legend class="bc-feed-legend">${legend}</legend>` : null}

          <div class="bc-episode-edit-submit-line">
            <div class="button-cluster">
              ${onSave ? html`<input name="submit-button" type="submit">` : null}
              ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
            </div>
            <div>
              ${onDeleteFeed
                ? deleteConfirm
                  ? html`
                    <button onClick=${hanldeCancelDelete}>Cancel</button>
                    <button onClick=${handleDeleteFeed}>Destroy</button>`
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
