/* eslint-env browser */
import { html, useState, useRef } from 'uland-isomorphic'
import { useLSP } from '../hooks/useLSP.js'

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
    ${deleted
      ? null
      : html`
      ${editing
        ? html`
          <div>
            <form ref="${formRef}" class="add-bookmark-form" id="add-bookmark-form" onsubmit=${handleSave}>
            <fieldset ?disabled=${saving}>
              <legend>New bookmark:</legend>
              <div>
                <label>
                  url:
                  <input type="url" name="url" />
                </label>
              </div>
              <div>
                <label>
                  Title:
                  <input type="text" name="title">
                </label>
              </div>
              <div>
                <label>
                  Note:
                  <textarea name="note"></textarea>
                </label>
              </div>
              <div>
                <label>
                  tags:
                  <input type="text" name="tags">
                </label>
              </div>
              <div class="button-cluster">
                <button onClick=${handleCancelEdit}>cancel</button>
                <input name="submit-button" type="submit">
              </div>
              <div class="error-box"></div>
            </fieldset>
          </form>
          </div>`
        : html`
          <div>
            <div>
              ${b.toread ? '⏀' : ''}
              ${b.starred ? '★' : '☆'}
              <a href="${b.url}" target="_blank">${b.title}</a>
            </div>
            <div><small><a href="${b.url}">${b.url}</a></small></div>
            <div>note: ${b.note}</div>
            <div>
              <small>c: <time datetime="${b.created_at}">${(new Date(b.created_at)).toLocaleString()}</time></small>
              ${b.updated_at ? html`<small>u: <time datetime="${b.updated_at}">${b.updated_at}</time>$}</small></div>` : null}
            ${b.sensitive ? html`<div>'🤫'</div>` : null}
            <div>tags: ${b.tags}</div>
            <div>${
              deleteConfirm
                ? html`
                  <button onClick=${cancelDelete}>cancel</button>
                  <button onClick=${deleteBookmark}>destroy</button>`
                : html`<button onClick=${initiateDelete}>delete</button>`
              }
              <button onClick=${handleEdit}>edit</button>
            </div>
          </div>`
      }
      `
    }`
}
