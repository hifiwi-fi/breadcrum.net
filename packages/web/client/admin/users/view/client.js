/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useEffect } from 'preact/hooks'
import { useWindow } from '../../../hooks/useWindow.js'
import { useSearchParams } from '../../../hooks/useSearchParms.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { UserTable } from '../../../components/user-table/user-table.js'
import { useAdminUser } from '../../../hooks/use-admin-user.js'
import { tc } from '../../../lib/typed-component.js'
import { mountPage } from '../../../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const window = useWindow()
  const { params } = useSearchParams(['id'])
  const userId = params['id'] ?? null

  useEffect(() => {
    if (!window) return
    if (!userId) {
      window.location.replace('/admin/users/')
    }
  }, [userId, window])

  const {
    userLoading,
    userError,
    user,
    handleDelete
  } = useAdminUser(userId)

  const title = user?.username ? ['👨‍💻', user?.username] : []
  useTitle(...title)

  return html`
    <div>
      ${userLoading ? html`<div>...</div>` : null}
      ${userError ? html`<div>${userError.message}</div>` : null}
      ${user ? tc(UserTable, { users: [user], onDelete: handleDelete }) : null}
    </div>
  `
}

mountPage(Page)
