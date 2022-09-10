/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'

import { feedDisplay } from './feed-display.js'
import { feedEdit } from './feed-edit.js'

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

  const handleSave = useCallback(async (newBookmark) => {
    // TODO
  }, [feed, state.apiUrl, reload, setEditing])

  const handleDeleteEpisode = useCallback(async (ev) => {
    // TODO
  }, [state.apiUrl, feed?.id, setDeleted, reload])

  return html`
  <div class="bc-feed">
    ${deleted
      ? null
      : editing
        ? feedEdit({
            feed,
            onSave: handleSave,
            onDeleteEpisode: handleDeleteEpisode,
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
