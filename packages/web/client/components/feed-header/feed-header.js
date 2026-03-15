/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeFeedRead } from '../../../routes/api/feeds/schemas/schema-feed-read.js'
 * @import { FeedUpdateData } from './feed-edit.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useMutation } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'
import { FeedDisplay } from './feed-display.js'
import { FeedEdit } from './feed-edit.js'
import { diffUpdate } from '../../lib/diff-update.js'

/**
 * @typedef {object} FeedHeaderProps
 * @property {TypeFeedRead} feed
 * @property {() => void} reload
 */

/**
 * @type {FunctionComponent<FeedHeaderProps>}
 */
export const FeedHeader = ({ feed, reload }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const saveMutation = useMutation({
    mutationFn: async (/** @type {FeedUpdateData} */ newFeed) => {
      const payload = diffUpdate(feed, newFeed)

      const response = await fetch(`${state.apiUrl}/feeds/${feed.id}`, {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    },
    onSuccess: () => {
      setEditing(false)
      reload()
    },
  })

  const onDeleteFeed = useCallback(async () => {
    // TODO implement this when feed CRUD is added
  }, [state.apiUrl, feed?.id, setDeleted, reload])

  return html`
  <div class="bc-feed">
    ${deleted
      ? null
      : editing
        ? tc(FeedEdit, {
            feed,
            onSave: saveMutation.mutateAsync,
            onDeleteFeed,
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${feed?.id}</code>`,
          })
        : tc(FeedDisplay, {
            feed,
            onEdit: handleEdit,
          })
    }
  </div>`
}
