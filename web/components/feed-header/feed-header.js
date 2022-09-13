/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'

import { feedDisplay } from './feed-display.js'
import { feedEdit } from './feed-edit.js'
import { diffFeed } from '../../lib/diff-feed.js'

export const feedHeader = Component(({ feed, feeds, reload }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (newFeed) => {
    const payload = diffFeed(feed, newFeed)

    const endpoint = `${state.apiUrl}/feeds/${feed.id}`
    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    })

    reload()
    setEditing(false)
  }, [feed, state.apiUrl, reload, setEditing])

  const onDeleteFeed = useCallback(async (ev) => {
    // TODO implement this when feed CRUD is added
  }, [state.apiUrl, feed?.id, setDeleted, reload])

  return html`
  <div class="bc-feed">
    ${deleted
      ? null
      : editing
        ? feedEdit({
            feed,
            onSave: handleSave,
            onDeleteFeed,
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${feed?.id}</code>`
          })
        : feedDisplay({
            feed,
            feeds,
            onEdit: handleEdit
          })
    }
  </div>`
})
