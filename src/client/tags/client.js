/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useUser } from '../hooks/useUser.js'
import { useWindow } from '../hooks/useWindow.js'
import { useLSP } from '../hooks/useLSP.js'
import { LoadingPlaceholder } from '../components/loading-placeholder/index.js'
import { tc } from '../lib/typed-component.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const window = useWindow()
  const [tags, setTags] = useState(/** @type {Array<{name: string, count: number}> | undefined} */(undefined))
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tagsError, setTagsError] = useState(/** @type {Error | null} */(null))
  let minCount = 0
  let maxCount = 0
  if (Array.isArray(tags) && tags.length > 0) {
    const counts = tags.map((tag) => tag.count).sort((a, b) => a - b)
    const [firstCount] = counts
    // Clamp to the 95th percentile to avoid a single outlier flattening the scale.
    const ceilingIndex = Math.floor((counts.length - 1) * 0.95)
    const ceilingCount = counts[ceilingIndex]
    minCount = firstCount ?? 0
    maxCount = ceilingCount ?? minCount
  }
  const countRange = Math.max(maxCount - minCount, 1)
  /** @param {number} count */
  const sizeForCount = (count) => {
    const minSize = 0.85
    const maxSize = 1.6
    const clamped = Math.min(count, maxCount)
    const ratio = (clamped - minCount) / countRange
    return `${minSize + (maxSize - minSize) * ratio}em`
  }

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

  const showEmptyState = Array.isArray(tags) && tags.length === 0 && !tagsLoading && !tagsError
  const showLoadingPlaceholder = tagsLoading && (!Array.isArray(tags) || tags.length === 0)
  const resultsClassName = (showEmptyState || showLoadingPlaceholder)
    ? 'bc-tags-results bc-tags-results-empty'
    : 'bc-tags-results'

  return html`
    <div class="bc-tags-page">
      <div class=${resultsClassName}>
        ${showLoadingPlaceholder
          ? tc(LoadingPlaceholder, { label: 'Loading tags' })
          : null}
        ${tagsError ? html`<div>${tagsError.message}</div>` : null}
        ${showEmptyState ? html`<div class="bc-tags-empty">Tag some bookmarks!</div>` : null}
        ${Array.isArray(tags)
          ? html`
            <div class="bc-tags-list">
              ${tags.map(tag => html`<a key=${tag.name} href=${`/bookmarks/?tag=${tag.name}`} style=${{ fontSize: sizeForCount(tag.count) }}>${tag.name}<sup>${tag.count}</sup></a>`)}
            </div>`
          : null}
      </div>
    </div>
`
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
