/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js'
 * @import { EpisodeUpdateData } from './episode-edit.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useMutation } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'
import { diffUpdate } from '../../lib/diff-update.js'
import { EpisodeEdit } from './episode-edit.js'
import { EpisodeView } from './episode-view.js'

/**
 * @typedef {object} EpisodeListProps
 * @property {TypeEpisodeReadClient} episode
 * @property {() => void} [onDelete]
 * @property {() => void} [onInvalidate]
 * @property {boolean | undefined} [clickForPreview]
 * @property {boolean} [showError]
 * @property {boolean} [fullView]
 */

/**
 * @type {FunctionComponent<EpisodeListProps>}
 */
export const EpisodeList = ({ episode, onDelete, onInvalidate, clickForPreview, showError, fullView }) => {
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
    mutationFn: async (/** @type {EpisodeUpdateData} */ newEpisode) => {
      const payload = diffUpdate(episode, newEpisode)

      const response = await fetch(`${state.apiUrl}/episodes/${episode.id}`, {
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
      onInvalidate?.()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${state.apiUrl}/episodes/${episode.id}`, {
        method: 'delete',
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    },
    onSuccess: () => {
      setDeleted(true)
      onInvalidate?.()
      onDelete?.()
    },
  })

  return html`
  <div class="bc-episode">
    ${deleted
      ? null
      : editing
        ? tc(EpisodeEdit, {
            episode,
            onSave: (/** @type {EpisodeUpdateData} */ newEpisode) => saveMutation.mutateAsync(newEpisode),
            onDeleteEpisode: () => deleteMutation.mutateAsync(),
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${episode?.id}</code>`,
          })
        : tc(EpisodeView, {
            episode,
            onEdit: handleEdit,
            clickForPreview,
            ...(showError !== undefined && { showError }),
            ...(fullView !== undefined && { fullView }),
          })
    }
  </div>`
}
