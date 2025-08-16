/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js'
 */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { useLSP } from '../../hooks/useLSP.js'
import { diffArchive } from './diff-archive.js'
import { tc } from '../../lib/typed-component.js'

import { ArchiveEdit } from './archive-edit.js'
import { ArchiveView } from './archive-view.js'

/** @type {FunctionComponent<{
 * archive: TypeArchiveReadClient & {
 *   bookmark: { id: string, title: string }
 * },
 * reload: () => void,
 * onDelete: () => void,
 * fullView?: boolean
}>} */
export const archiveList = ({ archive, reload, onDelete, fullView }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(/** @param {{ title: string }} newArchive */ async (newArchive) => {
    const payload = diffArchive(archive, newArchive)
    const endpoint = `${state.apiUrl}/archives/${archive.id}`

    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    reload()
    setEditing(false)
  }, [archive, state.apiUrl, reload, setEditing])

  const handleDeleteArchive = useCallback(async () => {
    await fetch(`${state.apiUrl}/archives/${archive.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json',
      },
    })

    setDeleted(true)
    onDelete()
  }, [state.apiUrl, archive.id, setDeleted, reload])

  return html`
  <div class="bc-archive">
    ${deleted
      ? null
      : editing
        ? tc(ArchiveEdit, {
            archive,
            onSave: handleSave,
            onDeleteArchive: handleDeleteArchive,
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
