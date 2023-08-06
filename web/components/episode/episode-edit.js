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

  const handleCancelDelete = useCallback((ev) => {
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
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current
    // const url = form.url.value
    const title = form.title.value
    const explicit = form.explicit.checked

    const formState = {
      title,
      explicit
    }

    try {
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
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
              <input disabled class='block bc-episode-url-edit' type="url" name="url" value="${e?.url}"/>
            </labe>
          </div>
          <div>
            <label class="block">
              title:
              <input class="block" type="text" name="title" value="${e?.title}">
            </label>
          </div>
          <div>
            <label>
              explicit:
              <input type="checkbox" name="explicit" ?checked="${e?.explicit}">
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
                    <button onClick=${handleCancelDelete}>Cancel</button>
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
