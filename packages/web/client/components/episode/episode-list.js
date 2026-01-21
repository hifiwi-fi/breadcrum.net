/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js'
 * @import { EpisodeUpdateData } from './episode-edit.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'
import { diffUpdate } from '../../lib/diff-update.js'
import { EpisodeEdit } from './episode-edit.js'
import { EpisodeView } from './episode-view.js'

/**
 * @typedef {object} EpisodeListProps
 * @property {TypeEpisodeReadClient} episode
 * @property {() => void} reload
 * @property {() => void} onDelete
 * @property {boolean | undefined} [clickForPreview]
 * @property {boolean} [showError]
 */

/**
 * @type {FunctionComponent<EpisodeListProps>}
 */
export const EpisodeList = ({ episode, reload, onDelete, clickForPreview, showError }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (/** @type {EpisodeUpdateData} */newEpisode) => {
    const payload = diffUpdate(episode, newEpisode)
    const endpoint = `${state.apiUrl}/episodes/${episode.id}`

    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    reload()
    setEditing(false)
  }, [episode, state.apiUrl, reload, setEditing])

  const handleDeleteEpisode = useCallback(async () => {
    await fetch(`${state.apiUrl}/episodes/${episode.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json',
      },
    })

    setDeleted(true)
    onDelete()
  }, [state.apiUrl, episode.id, setDeleted, reload])

  return html`
  <div class="bc-episode">
    ${deleted
      ? null
      : editing
        ? tc(EpisodeEdit, {
            episode,
            onSave: handleSave,
            onDeleteEpisode: handleDeleteEpisode,
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${episode?.id}</code>`,
          })
        : tc(EpisodeView, {
            episode,
            onEdit: handleEdit,
            clickForPreview,
            ...(showError !== undefined && { showError }),
          })
    }
  </div>`
}
