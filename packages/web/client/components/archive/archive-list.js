/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js'
 * @import { ArchiveFormState } from './archive-edit.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useMutation, useQueryClient } from '@tanstack/preact-query'
import { useLSP } from '../../hooks/useLSP.js'
import { tc } from '../../lib/typed-component.js'

import { ArchiveEdit } from './archive-edit.js'
import { ArchiveView } from './archive-view.js'
import { diffUpdate } from '../../lib/diff-update.js'

/** @type {FunctionComponent<{
 * archive: TypeArchiveReadClient,
 * onDelete?: () => void,
 * fullView?: boolean
}>} */
export const ArchiveList = ({ archive, onDelete, fullView }) => {
  const state = useLSP()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['archives'] })
    queryClient.invalidateQueries({ queryKey: ['archive-view'] })
    queryClient.invalidateQueries({ queryKey: ['search-archives'] })
  }, [queryClient])

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const saveMutation = useMutation({
    mutationFn: async (/** @type {ArchiveFormState} */ newArchive) => {
      const payload = diffUpdate(archive, newArchive)

      const response = await fetch(`${state.apiUrl}/archives/${archive.id}`, {
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
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${state.apiUrl}/archives/${archive.id}`, {
        method: 'delete',
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    },
    onSuccess: () => {
      setDeleted(true)
      invalidate()
      onDelete?.()
    },
  })

  return html`
  <div class="bc-archive">
    ${deleted
      ? null
      : editing
        ? tc(ArchiveEdit, {
            archive,
            onSave: (/** @type {ArchiveFormState} */ newArchive) => saveMutation.mutateAsync(newArchive),
            onDeleteArchive: () => deleteMutation.mutateAsync(),
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${archive?.id}</code>`,
          })
        : tc(ArchiveView, {
            archive,
            onEdit: handleEdit,
            fullView: fullView || false
          })
    }
  </div>`
}
