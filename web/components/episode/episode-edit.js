/* eslint-env browser */
/* eslint-disable camelcase */
import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'
export const episodeEdit = Component(({
  episode: e,
  onSave,
  onDeleteEpisode,
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

  const handleDeleteEpisode = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      await onDeleteEpisode()
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, onDeleteEpisode])

  const handleSave = useCallback(async (ev) => {
    // TODO  this is the bookmark impl
  }, [setDisabled, setError, formRef?.current, onSave])

  // Parent can delay passing a bookmark to disable the form.
  const initializing = e == null

  return html`
    <div class='bc-episode-edit'>
      <form ref="${formRef}" class="add-episode-form" id="add-episode-form" onsubmit=${handleSave}>
        <fieldset ?disabled=${disabled || initializing}>
          ${legend ? html`<legend class="bc-episode-legend">${legend}</legend>` : null}

          <div>
            <label class='block'>
              url:
              <input class='block bc-episode-url-edit' type="url" name="url" value="${e?.url}"/>
            </label>
          </div>

          <div class="bc-episode-edit-submit-line">
            <div class="button-cluster">
              ${onSave ? html`<input name="submit-button" type="submit">` : null}
              ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
            </div>
            <div>
              ${onDeleteEpisode
                ? deleteConfirm
                  ? html`
                    <button onClick=${hanldeCancelDelete}>Cancel</button>
                    <button onClick=${handleDeleteEpisode}>Destroy</button>`
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
