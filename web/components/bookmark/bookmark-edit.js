/* eslint-env browser */
import { Component, html, useState, useRef } from 'uland-isomorphic'

export const bookmarkEdit = Component(({
  bookmark: b,
  onSave = () => {},
  onDeleteBookmark = () => {},
  onCancelEdit = () => {}
} = {}) => {
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  function handleInitiateDelete (ev) {
    setDeleteConfirm(true)
  }

  function hanldeCancelDelete (ev) {
    setDeleteConfirm(false)
  }

  async function handleDeleteBookmark () {
    setDisabled(true)
    setError(null)
    try {
      await onDeleteBookmark()
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }

  async function handleSave (ev) {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    const form = formRef.current
    console.log(form)
    const saveData = {}
    try {
      await onSave(saveData)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }

  return html`
    <div class='bc-bookmark-edit'>
      <form ref="${formRef}" class="add-bookmark-form" id="add-bookmark-form" onsubmit=${handleSave}>
      <fieldset ?disabled=${disabled}>
        <legend class="bc-bookmark-legend">edit: <code>${b.id}</code></legend>
        <div>
          <label class='block'>
            url:
            <input class='block bc-bookmark-url-edit' type="url" name="url" value="${b.url}"/>
          </label>
        </div>
        <div>
          <label class="block">
            Title:
            <input class="block" type="text" name="title" value="${b.title}">
          </label>
        </div>
        <div>
          <label class="block">
            note:
            <textarea class="bc-bookmark-note" rows="6" name="note">${b.note}</textarea>
          </label>
        </div>
        <div>
          <label class="block">
            tags:
            <input class="block" type="text" name="tags" value="${b.tags?.join(' ')}">
          </label>
        </div>
        <div>
          <label>
            to read:
            <input type="checkbox" name="toread" ?checked="${b.toread}">
          </label>
          <label>
            starred:
            <input type="checkbox" name="starred" ?checked="${b.starred}">
          </label>
          <label>
            sensitive:
            <input type="checkbox" name="toread" ?checked="${b.sensitive}">
          </label>
        </div>
        <div>
          ${
            deleteConfirm
              ? html`
                <button onClick=${hanldeCancelDelete}>cancel</button>
                <button onClick=${handleDeleteBookmark}>destroy</button>`
              : html`<button onClick=${handleInitiateDelete}>delete</button>`
          }
        </div>
        <div class="button-cluster">
          <button onClick=${onCancelEdit}>cancel</button>
          <input name="submit-button" type="submit">
        </div>
        ${error ? html`<div class="error-box">${error.message}</div>` : null}
      </fieldset>
    </form>
    </div>`
})
