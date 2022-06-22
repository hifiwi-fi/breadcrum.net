/* eslint-env browser */
import { Component, html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useLSP } from '../hooks/useLSP.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()
  const window = useWindow()
  const [tags, setTags] = useState()
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tagsError, setTagsError] = useState(null)

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  useEffect(() => {
    async function getTags () {
      console.log('getting tags')
      setTagsLoading(true)
      setTagsError(null)

      const response = await fetch(`${state.apiUrl}/tags`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setTags(body?.data)
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getTags()
        .then(() => { console.log('tags done') })
        .catch(err => { console.error(err); setTagsError(err) })
        .finally(() => { setTagsLoading(false) })
    }
  }, [state.apiUrl])

  return html`
    <div>
      ${tagsLoading && !Array.isArray(tags) ? html`<div>...</div>` : null}
      ${tagsError ? html`<div>${tagsError.message}</div>` : null}
      ${Array.isArray(tags)
        ? html`
          <div class="bc-tags-list">
            ${tags.map(tag => html`<a href=${`/bookmarks/?tag=${tag.name}`}>${tag.name}<sup>${tag.count}</sup></a>`)}
          </div>`
        : null}
    </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
