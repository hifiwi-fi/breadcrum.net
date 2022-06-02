// @ts-check
/* eslint-env browser */
import { Component, html, useState, useRef } from 'uland-isomorphic'

export const bookmarkEdit = Component(({
  bookmark: b,
  onSave,
  onDeleteBookmark,
  onCancelEdit,
  legend
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

  async function handleDeleteBookmark (ev) {
    ev.preventDefault()
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

    const url = form.url.value
    const title = form.title.value
    const note = form.note.value
    const rawTags = form.tags.value
    const tags = rawTags.split(' ').map(t => t.trim()).filter(t => Boolean(t))
    const toread = form.toread.checked
    const starred = form.starred.checked
    const sensitive = form.sensitive.checked

    const formState = {
      url,
      title,
      note,
      tags,
      toread,
      starred,
      sensitive
    }

    try {
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }

  // Parent can delay passing a bookmark to disable the form.
  const initializing = b == null

  return html`
    <div class='bc-bookmark-edit'>
      <form ref="${formRef}" class="add-bookmark-form" id="add-bookmark-form" onsubmit=${handleSave}>
      <fieldset ?disabled=${disabled || initializing}>
        ${legend ? html`<legend class="bc-bookmark-legend">${legend}</legend>` : null}
        <div>
          <label class='block'>
            url:
            <input class='block bc-bookmark-url-edit' type="url" name="url" value="${b?.url}"/>
          </label>
        </div>
        <div>
          <label class="block">
            Title:
            <input class="block" type="text" name="title" value="${b?.title}">
          </label>
        </div>
        <div>
          <label class="block">
            note:
            <textarea class="bc-bookmark-note" rows="6" name="note">${b?.note}</textarea>
          </label>
        </div>
        <div>
          <label class="block">
            tags:
            <input class="block" type="text" name="tags" value="${b?.tags?.join(' ')}">
          </label>
        </div>
        <div>
          <label>
            to read:
            <input type="checkbox" name="toread" ?checked="${b?.toread}">
          </label>
          <label>
            starred:
            <input type="checkbox" name="starred" ?checked="${b?.starred}">
          </label>
          <label>
            sensitive:
            <input type="checkbox" name="sensitive" ?checked="${b?.sensitive}">
          </label>
        </div>
        <div>
          ${onDeleteBookmark
            ? deleteConfirm
              ? html`
                <button onClick=${hanldeCancelDelete}>cancel</button>
                <button onClick=${handleDeleteBookmark}>destroy</button>`
              : html`<button onClick=${handleInitiateDelete}>delete</button>`
            : null
          }
        </div>
        <div class="button-cluster">
          ${onCancelEdit ? html`<button onClick=${onCancelEdit}>cancel</button>` : null}
          ${onSave ? html`<input name="submit-button" type="submit">` : null}
        </div>
        ${error ? html`<div class="error-box">${error.message}</div>` : null}
      </fieldset>
    </form>
    </div>`
})
