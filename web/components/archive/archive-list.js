/* eslint-env browser */
import { Component, html, useState, useCallback } from 'uland-isomorphic'
import { useLSP } from '../../hooks/useLSP.js'
import { diffArchive } from './diff-archive.js'

import { archiveEdit } from './archive-edit.js'
import { archiveView } from './archive-view.js'

export const archiveList = Component(({ archive, reload, onDelete, clickForPreview }) => {
  const state = useLSP()
  const [editing, setEditing] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
  }, [setEditing])

  const handleSave = useCallback(async (newArchive) => {
    const payload = diffArchive(archive, newArchive)
    const endpoint = `${state.apiUrl}/archives/${archive.id}`

    await fetch(endpoint, {
      method: 'put',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    reload()
    setEditing(false)
  }, [archive, state.apiUrl, reload, setEditing])

  const handleDeleteArchive = useCallback(async (ev) => {
    await fetch(`${state.apiUrl}/archives/${archive.id}`, {
      method: 'delete',
      headers: {
        'accept-encoding': 'application/json'
      }
    })

    setDeleted(true)
    onDelete()
  }, [state.apiUrl, archive.id, setDeleted, reload])

  return html`
  <div class="bc-archive">
    ${deleted
      ? null
      : editing
        ? archiveEdit({
            archive,
            onSave: handleSave,
            onDeleteArchive: handleDeleteArchive,
            onCancelEdit: handleCancelEdit,
            legend: html`edit: <code>${archive?.id}</code>`
          })
        : archiveView({
            archive,
            onEdit: handleEdit,
            clickForPreview
          })
    }
  </div>`
})
