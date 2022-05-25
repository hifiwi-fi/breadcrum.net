/* eslint-env browser */
import { html, useState, useRef } from 'uland-isomorphic'
import { useLSP } from '../hooks/useLSP.js'
import { unreadIcon } from './unread.js'
import { star } from './star.js'

export function bookmarkEdit ({
  bookmark: b,
  handleSave = () => {},
  deleteConfirm = false,
  formRef,
  saving = false,
  cancelDelete = () => {},
  deleteBookmark = () => {},
  initiateDelete = () => {},
  handleCancelEdit = () => {}
} = {}) {
  return html`
    <div>
      <form ref="${formRef}" class="add-bookmark-form" id="add-bookmark-form" onsubmit=${handleSave}>
      <fieldset ?disabled=${saving}>
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
                <button onClick=${cancelDelete}>cancel</button>
                <button onClick=${deleteBookmark}>destroy</button>`
              : html`<button onClick=${initiateDelete}>delete</button>`
          }
        </div>
        <div class="button-cluster">
          <button onClick=${handleCancelEdit}>cancel</button>
          <input name="submit-button" type="submit">
        </div>
        <div class="error-box"></div>
      </fieldset>
    </form>
    </div>`
}

export function bookmarkView ({
  bookmark: b,
  handleEdit = () => {}
} = {}) {
  return html`
    <div class="bc-bookmark-display">
      <div>
        ${unreadIcon(b.toread)}
        ${star(b.starred)}
        <a class="${b.toread ? 'bc-bookmark-title-toread' : null}" href="${b.url}" target="_blank">${b.title}</a>
      </div>
      <div class="bc-bookmark-url-display"><a href="${b.url}">${b.url}</a></div>
      ${b.note ? html`<div>${b.note}</div>` : null}
      <div>
      ${b.tags?.length > 0
        ? html`
          <div class="bc-tags-display">
            🏷
            ${b.tags.map(tag => html`<a href=${`/tags/t/?tag=${tag}`}>${tag}</a> `)}
          </div>`
        : null
      }
      <div class="bc-date">
        <a href="${`./b/?id=${b.id}`}">
          <time datetime="${b.created_at}">
            ${(new Date(b.created_at)).toLocaleString()}
          </time>
        </a>
      </div>
      ${b.sensitive ? html`<div>'🤫'</div>` : null}
      <div>
        <button onClick=${handleEdit}>edit</button>
      </div>
    </div>`
}

export function bookmark ({ bookmark: b }) {
  const [editing, setEditing] = useState(false)
  const state = useLSP()
  const [deleteConfirm, setDeleteCobnfirm] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const formRef = useRef()
  const [saving, setSaving] = useState(false)

  function handleEdit () {
    setEditing(true)
  }

  function handleCancelEdit () {
    setEditing(false)
  }

  async function handleSave () {
    // handle save here
    setSaving(true)
    setEditing(false)
    setSaving(false)
  }

  async function deleteBookmark (ev) {
    const controller = new AbortController()
    const response = await fetch(`${state.apiUrl}/bookmarks/${b.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json'
      },
      signal: controller.signal,
      credentials: 'include'
    })
    console.log(await response.json())
    setDeleted(true)
  }

  function initiateDelete (ev) {
    setDeleteCobnfirm(true)
  }

  function cancelDelete (ev) {
    setDeleteCobnfirm(false)
  }

  return html`
  <div class="bc-bookmark">
    ${deleted
      ? null
      : html`
      ${editing
        ? bookmarkEdit({
          bookmark: b,
          handleSave,
          deleteConfirm,
          formRef,
          saving,
          cancelDelete,
          deleteBookmark,
          initiateDelete,
          handleCancelEdit
        })
        : bookmarkView({ bookmark: b, handleEdit })
      }
    </div>`
    }`
}
