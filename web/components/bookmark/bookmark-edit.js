/* eslint-env browser */
/* eslint-disable camelcase */
import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'

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

  const handleInitiateDelete = useCallback((ev) => {
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  const hanldeCancelDelete = useCallback((ev) => {
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  const handleDeleteBookmark = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      await onDeleteBookmark()
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, onDeleteBookmark])

  const handleSave = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current

    const url = form.url.value
    const title = form.title.value
    const note = form.note.value
    const rawTags = form.tags.value
    const tags = Array.from(new Set(rawTags.split(' ').map(t => t.trim()).filter(t => Boolean(t))))
    const toread = form.toread.checked
    const starred = form.starred.checked
    const sensitive = form.sensitive.checked
    const episodeMedium = form.episodeMedium.value

    const createEpisode = episodeMedium !== 'none'
      ? {
          type: 'redirect',
          medium: episodeMedium
        }
      : null

    const formState = {
      url,
      title,
      note,
      tags,
      toread,
      starred,
      sensitive,
      createEpisode
    }

    try {
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, formRef?.current, onSave])

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
            title:
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
          <label for="bc-podcast-radio">
            create podcast episode:
          <label>

          <div id="bc-podcast-radio">
            <label>
              <span>video</span>
              <input
                type="radio"
                name="episodeMedium"
                value="video"
                ?checked="${b?.podcast_items?.[0]?.medium === 'video'}"
              >
            </label>

            <label>
              <span>audio</span>
              <input
                type="radio"
                name="episodeMedium"
                value="audio"
                ?checked="${b?.podcast_items?.[0]?.medium === 'audio'}"
              >
            </label>

            <label>
              <span>none</span>
              <input
                type="radio"
                name="episodeMedium"
                value="none"
                ?checked="${!b?.podcast_items?.[0]?.medium}"
              >
            </label>
          </div>
        </div>
        <div class="bc-bookmark-edit-submit-line">
          <div class="button-cluster">
            ${onSave ? html`<input name="submit-button" type="submit">` : null}
            ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
          </div>
          <div>
            ${onDeleteBookmark
              ? deleteConfirm
                ? html`
                  <button onClick=${hanldeCancelDelete}>Cancel</button>
                  <button onClick=${handleDeleteBookmark}>Destroy</button>`
                : html`<button onClick=${handleInitiateDelete}>Delete</button>`
              : null
            }
          </div>
        </div>
        ${error ? html`<div class="error-box">${error.message}</div>` : null}
      </fieldset>
    </form>
    </div>`
})
