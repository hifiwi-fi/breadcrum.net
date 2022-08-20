/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'

import { episodeEdit } from './episode-edit.js'
import { episodeView } from './episode-view.js'

export const episodeList = Component(({ episode, reload }) => {
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
  }, [episode, state.apiUrl, reload, setEditing])

  const handleDeleteEpisode = useCallback(async (ev) => {
    // TODO
  }, [state.apiUrl, episode.id, setDeleted, reload])

  return html`
  <div class="bc-episode">
    ${deleted
      ? null
      : editing
        ? episodeEdit({
            episode,
            onSave: handleSave,
            onDeleteEpisode: handleDeleteEpisode,
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${episode?.id}</code>`
          })
        : episodeView({
            episode,
            onEdit: handleEdit
          })
    }
  </div>`
})
