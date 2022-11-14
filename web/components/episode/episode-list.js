/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { diffEpisode } from './diff-episode.js'

import { episodeEdit } from './episode-edit.js'
import { episodeView } from './episode-view.js'

export const episodeList = Component(({ episode, reload, onDelete }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (newEpisode) => {
    const payload = diffEpisode(episode, newEpisode)
    const endpoint = `${state.apiUrl}/episodes/${episode.id}`

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
  }, [episode, state.apiUrl, reload, setEditing])

  const handleDeleteEpisode = useCallback(async (ev) => {
    await fetch(`${state.apiUrl}/episodes/${episode.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json'
      },
      credentials: 'include'
    })

    setDeleted(true)
    onDelete()
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
