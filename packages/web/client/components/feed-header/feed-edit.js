/* eslint-env browser */

import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'
export const feedEdit = Component(({
  feed: f,
  onSave,
  onDeleteFeed,
  onCancelEdit,
  legend,
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
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current

    const title = form.title.value
    const description = form.description.value
    const explicit = form.explicit.checked

    const formState = {
      title,
      description,
      explicit,
    }

    try {
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, formRef?.current, onSave])

  // Parent can delay passing a bookmark to disable the form.
  const initializing = f == null

  return html`
    <div class='bc-feed-edit'>
      <form ref="${formRef}" class="add-feed-form" id="add-feed-form" onsubmit=${handleSave}>
        <fieldset ?disabled=${disabled || initializing}>
          ${legend ? html`<legend class="bc-feed-legend">${legend}</legend>` : null}

          <div>
            <label class='block'>
              title:
              <input
                class='block bc-feed-title-edit'
                type="text"
                name="title"
                maxlength="255"
                minlength="1"
                value="${f?.title}"
              />
            </label>
          </div>

          <div>
            <label class="block">
              note:
              <textarea
                class="block bc-feed-description-edit"
                rows="6"
                name="description"
              >
                ${f?.description}
              </textarea>
            </label>
          </div>

          <div>
            <label>
              explicit:
              <input type="checkbox" name="explicit" ?checked="${f?.explicit}">
            </label>
          </div>

          <div class="bc-feed-edit-submit-line">
            <div class="button-cluster">
              ${onSave ? html`<input name="submit-button" type="submit">` : null}
              ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
            </div>
            <div>
              ${onDeleteFeed && !f?.default_feed
                ? deleteConfirm
                  ? html`
                    <button onClick=${handleCancelDelete}>Cancel</button>
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
