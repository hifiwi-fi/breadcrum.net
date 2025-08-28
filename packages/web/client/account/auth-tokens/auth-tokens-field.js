/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'
import { useAuthTokens } from '../../hooks/useAuthTokens.js'
import { authTokenList } from '../../components/auth-token/auth-token-list.js'
import { useQuery } from '../../hooks/useQuery.js'
import { useWindow } from '../../hooks/useWindow.js'
import { ManageAuthTokenField } from '../../components/auth-token/auth-token-manage.js'

/**
 * @typedef {{}} AuthTokensProps
 */

/**
 * @type {FunctionComponent<AuthTokensProps>}
 */
export const AuthTokens = () => {
  const window = useWindow()
  const {
    tokensError,
    tokensLoading,
    tokens,
    reloadAuthTokens,
    before,
    after,
    beforeParams,
    afterParams
  } = useAuthTokens()

  const { pushState } = useQuery()

  const onPageNav = useCallback((/** @type{MouseEvent & {currentTarget: HTMLAnchorElement}} */ev) => {
    ev.preventDefault()
    pushState(ev.currentTarget.href)
    // window?.scrollTo({ top: 0 })
  }, [window, pushState])

  return html`
    <dt>Auth Tokens</dt>
    <dd>
      <div class="bc-help-text">
        Manage auth tokens for web and API sessions. Auth tokens are like a password so keep them safe.
      </div>

      <${ManageAuthTokenField} reload=${reloadAuthTokens} />

      <div class="pagination-buttons">
        ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
        ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</a>` : null}
      </div>

      ${tokensLoading && !Array.isArray(tokens) ? html`<div>...</div>` : null}
      ${tokensError ? html`<div>${tokensError.message}</div>` : null}

      ${Array.isArray(tokens)
        ? tokens.map(t => html`<${authTokenList} key=${t.jti} authToken=${t} reload=${reloadAuthTokens} onDelete=${reloadAuthTokens} />`)
        : null}

      <div class="pagination-buttons">
        ${before ? html`<a onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
        ${after ? html`<a onClick=${onPageNav} href=${'./?' + afterParams}>later</a>` : null}
      </div>
    </dd>
  `
}
