/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */
/** @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useUser } from '../../hooks/useUser.js'
// @ts-ignore - version is a string from bookmarklet package
import { version } from '@breadcrum/bookmarklet/dist/version.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useQuery } from '../../hooks/useQuery.js'
import { BookmarkEdit } from '../../components/bookmark/bookmark-edit.js'
import { diffUpdate, arraySetEqual } from '../../lib/diff-update.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  useUser()
  const { query } = useQuery()
  const [bookmark, setBookmark] = useState(/** @type {Partial<TypeBookmarkReadClient> | null} */(null))
  const [newlyCreated, setNewlyCreated] = useState(false)
  const [bookmarkletUpdateAvailable, setBookmarkletUpdateAvailable] = useState(false)
  const [bookmarkletVersion, setBookmarkletVersion] = useState(/** @type {string | undefined} */(undefined))

  useEffect(() => {
    if (!query) return

    // PWAs send urls as the summary (text) and not the url, in most cases :(
    const summaryValue = query.get('summary')
    const pwaTextAsUrl = Boolean(!query.get('url') && summaryValue && URL.canParse(summaryValue))

    const workingUrl = pwaTextAsUrl ? summaryValue : query.get('url')
    const workingSummary = pwaTextAsUrl ? undefined : summaryValue

    const setFallbackBookmark = () => {
      setBookmark({
        url: workingUrl ?? '',
        title: query.get('title') || '',
        note: query.get('note') || '',
        summary: workingSummary ?? '',
        tags: query.getAll('tags').filter(t => Boolean(t)),
      })
    }

    const init = async () => {
      setNewlyCreated(false)
      const ver = query.get('ver')
      setBookmarkletVersion(ver || undefined)
      if (ver !== version || query.get('description')) setBookmarkletUpdateAvailable(true)

      if (!workingUrl) {
        setFallbackBookmark()
        return
      }

      const payload = /** @type {any} */ ({ url: workingUrl })
      const titleValue = query.get('title')
      const noteValue = query.get('note')
      if (titleValue) payload.title = titleValue
      if (noteValue) payload.note = noteValue

      if (workingSummary) payload.summary = workingSummary
      const queryTags = query.getAll('tags').filter(t => Boolean(t))
      if (queryTags.length > 0) payload.tags = queryTags

      const params = new URLSearchParams()

      const serverMeta = query.get('meta')
      if (serverMeta === 'false') params.set('meta', 'false')

      const response = await fetch(`${state.apiUrl}/bookmarks?${params.toString()}`, {
        method: 'put',
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
        },
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        const maybeBookmark = body?.data
        if (maybeBookmark) {
          setBookmark(maybeBookmark)
          if (response.status === 201) setNewlyCreated(true)
        } else {
          setFallbackBookmark()
        }
      } else {
        throw new Error(`${response.status} ${await response.text()}`)
      }
    }

    init().catch(err => {
      console.error(err)
      setFallbackBookmark()
    })
  }, [query, state.apiUrl])

  const existingBookmark = Boolean(bookmark?.id)

  async function handleSaveBookmark (/** @type {TypeBookmarkReadClient} */ newBookmark) {
    // Clean request for updates
    const payload = (existingBookmark && bookmark)
      ? diffUpdate(bookmark, newBookmark, {
        tags: arraySetEqual,
        archive_urls: arraySetEqual,
      })
      : newBookmark

    if (payload && Object.keys(payload).length === 0) {
      // empty update
      finish(undefined)
      return
    }

    const endpoint = existingBookmark
      ? `${state.apiUrl}/bookmarks/${bookmark?.id}`
      : `${state.apiUrl}/bookmarks`

    const response = await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      finish(await response.json())
    } else {
      throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
    }

    function finish (/** @type {any} */ responseBody) {
      const { id } = responseBody?.data ?? {}
      const redirectTarget = id ? `/bookmarks/view/?id=${id}` : '/bookmarks'
      const jumpValue = query?.get('jump')
      if (jumpValue === 'close') {
        try {
          window.close()
        } catch (err) {
          console.error(err)
          window.location.replace(redirectTarget)
        }
      } else {
        window.location.replace(redirectTarget)
      }
    }
  }

  return html`
    <${BookmarkEdit}
      bookmark=${bookmark}
      bookmarkletUpdateAvailable=${bookmarkletUpdateAvailable}
      bookmarkletVersion=${bookmarkletVersion}
      onSave=${handleSaveBookmark}
      legend=${existingBookmark
        ? newlyCreated
          ? html`created: <code>${bookmark?.id}</code>`
          : html`edit: <code>${bookmark?.id}</code>`
        : 'New bookmark'}
    />
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
