/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useLSP } from '../hooks/useLSP.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const [tags, setTags] = useState(/** @type {Array<{name: string, count: number}> | undefined} */(undefined))
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tagsError, setTagsError] = useState(/** @type {Error | null} */(null))

  useEffect(() => {
    async function getTags () {
      if (!window) return

      console.log('getting tags')
      setTagsLoading(true)
      setTagsError(null)
      const pageParams = new URLSearchParams(window.location.search)
      pageParams.set('sensitive', state.sensitive.toString())
      const response = await fetch(`${state.apiUrl}/tags?${pageParams.toString()}`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
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
        .catch(err => {
          console.error(err)
          setTagsError(/** @type {Error} */(err))
        })
        .finally(() => { setTagsLoading(false) })
    }
  }, [state.apiUrl, state.sensitive])

  return html`
    <div>
      ${tagsLoading && !Array.isArray(tags) ? html`<div>...</div>` : null}
      ${tagsError ? html`<div>${tagsError.message}</div>` : null}
      ${Array.isArray(tags)
        ? html`
          <div class="bc-tags-list">
            ${tags.map(tag => html`<a key=${tag.name} href=${`/bookmarks/?tag=${tag.name}`}>${tag.name}<sup>${tag.count}</sup></a>`)}
          </div>`
        : null}
    </div>
`
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
