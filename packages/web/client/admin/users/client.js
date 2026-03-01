/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { useSearchParamsAll } from '../../hooks/useSearchParms.js'
import { useWindow } from '../../hooks/useWindow.js'
import { UserTable } from '../../components/user-table/user-table.js'
import { useAdminUsers } from '../../hooks/use-admin-users.js'
import { tc } from '../../lib/typed-component.js'
import { PaginationButtons } from '../../components/pagination-buttons/index.js'
import { mountPage } from '../../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  const window = useWindow()
  const { pushState } = useSearchParamsAll()
  const {
    usersLoading,
    usersError,
    users,
    beforeParams,
    afterParams
  } = useAdminUsers()

  const onPageNav = useCallback((/** @type {MouseEvent & {currentTarget: HTMLAnchorElement}} */ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    if (window) {
      window.scrollTo({ top: 0 })
    }
  }, [pushState, window])

  return html`
    <${PaginationButtons} onPageNav=${onPageNav} beforeParams=${beforeParams} afterParams=${afterParams} />

    ${usersLoading && !Array.isArray(users) ? html`<div>...</div>` : null}
    ${usersError ? html`<div>${usersError.message}</div>` : null}
    ${Array.isArray(users)
      ? tc(UserTable, { users })
      : null
    }

    <${PaginationButtons} onPageNav=${onPageNav} beforeParams=${beforeParams} afterParams=${afterParams} />
  `
}

mountPage(Page)
