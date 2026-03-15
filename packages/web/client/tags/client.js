/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useMemo } from 'preact/hooks'
import { useQuery as useTanstackQuery } from '@tanstack/preact-query'
import { useUser } from '../hooks/useUser.js'
import { useSearchParamsAll } from '../hooks/useSearchParams.js'
import { useLSP } from '../hooks/useLSP.js'
import { LoadingPlaceholder } from '../components/loading-placeholder/index.js'
import { tc } from '../lib/typed-component.js'
import { mountPage } from '../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const { searchParamsAll } = useSearchParamsAll()

  const queryString = useMemo(() => (searchParamsAll ? searchParamsAll.toString() : ''), [searchParamsAll])
  const queryKey = useMemo(() => ([
    'tags',
    state.apiUrl,
    state.sensitive,
    queryString,
  ]), [queryString, state.apiUrl, state.sensitive])

  const { data: tags, isPending: tagsLoading, error: tagsError } = useTanstackQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const pageParams = new URLSearchParams(queryString)
      pageParams.set('sensitive', state.sensitive.toString())

      const response = await fetch(`${state.apiUrl}/tags?${pageParams.toString()}`, {
        method: 'get',
        headers: {
          accept: 'application/json',
        },
        signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        return /** @type {Array<{name: string, count: number}>} */(body?.data ?? [])
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
    enabled: Boolean(user),
  })
  const hasTagsData = Array.isArray(tags)
  const tagsList = /** @type {Array<{name: string, count: number}>} */ (hasTagsData ? tags : [])

  let minCount = 0
  let maxCount = 0
  if (tagsList.length > 0) {
    const counts = tagsList.map((tag) => tag.count).sort((a, b) => a - b)
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

  const showEmptyState = hasTagsData && tagsList.length === 0 && !tagsLoading && !tagsError
  const showLoadingPlaceholder = tagsLoading && (!hasTagsData || tagsList.length === 0)
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
        ${hasTagsData
          ? html`
            <div class="bc-tags-list">
              ${tagsList.map(tag => html`<a key=${tag.name} href=${`/bookmarks/?tag=${tag.name}`} style=${{ fontSize: sizeForCount(tag.count) }}>${tag.name}<sup>${tag.count}</sup></a>`)}
            </div>`
          : null}
      </div>
    </div>
`
}

mountPage(Page)
