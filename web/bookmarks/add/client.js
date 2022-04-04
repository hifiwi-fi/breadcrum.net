/* eslint-env browser */
import { html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { fetch } from 'fetch-undici'
import { useLSP } from '../../hooks/useLSP.js'

export function addBookmarkPage () {
  const state = useLSP()
  const { user, loading } = useUser()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  async function addBookmark (ev) {
    ev.preventDefault()
    setSaving(true)

    const url = ev.currentTarget.url.value
    const title = ev.currentTarget.title.value
    const note = ev.currentTarget.note.value
    const rawTags = ev.currentTarget.tags.value

    const tags = rawTags.split(' ').map(t => t.trim()).filter(t => Boolean(t)).map(t => ({ name: t }))

    try {
      const response = await fetch(`${state.apiUrl}/bookmarks`, {
        method: 'put',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ url, title, note, tags }),
        credentials: 'include'
      })

      window.location.replace('/bookmarks')
    } catch (err) {
      console.log(err)
    } finally {
      setSaving(false)
    }
  }

  return html`
    <div>
      <form class="add-bookmark-form" id="add-bookmark-form" onsubmit=${addBookmark}>
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
            <input name="submit-button" type="submit">
          </div>
          <div class="error-box"></div>
        </fieldset>
      </form>
    </div>
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), addBookmarkPage)
}
