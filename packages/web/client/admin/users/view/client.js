/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useWindow } from '../../../hooks/useWindow.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { UserTable } from '../../../components/user-table/user-table.js'
import { useAdminUser } from '../../../hooks/use-admin-user.js'
import { tc } from '../../../lib/typed-component.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const window = useWindow()
  const [userId, setUserId] = useState(/** @type {string | null} */(null))

  // Get user ID from URL params
  useEffect(() => {
    if (!window) return

    const pageParams = new URLSearchParams(window.location.search)
    const id = pageParams.get('id')

    if (!id) {
      window.location.replace('/admin/users/')
      return
    }

    setUserId(id)
  }, [window])

  const {
    userLoading,
    userError,
    user,
    reloadAdminUser,
    handleDelete
  } = useAdminUser(userId)

  const title = user?.username ? ['👨‍💻', user?.username] : []
  useTitle(...title)

  return html`
    <div>
      ${userLoading ? html`<div>...</div>` : null}
      ${userError ? html`<div>${userError.message}</div>` : null}
      ${user ? tc(UserTable, { users: [user], reload: reloadAdminUser, onDelete: handleDelete }) : null}
    </div>
  `
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
