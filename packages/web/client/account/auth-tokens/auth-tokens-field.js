/// <reference lib="dom" />
/* eslint-env browser */

// @ts-expect-error
import { Component, html, useCallback } from 'uland-isomorphic'
import { useAuthTokens } from '../../hooks/useAuthTokens.js'
import { authTokenList } from '../../components/auth-token/auth-token-list.js'
import { useQuery } from '../../hooks/useQuery.js'
import { useWindow } from '../../hooks/useWindow.js'
import { manageAuthTokenField } from '../../components/auth-token/auth-token-manage.js'

/**
 * @typedef {() => any} AuthTokensField
 */

/**
 * @type {AuthTokensField}
 */
export const authTokens = Component(/** @type{AuthTokensField} */() => {
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
        ℹ️ Manage auth tokens for web and API sessions. Auth tokens are like a password so keep them safe.
      </div>
      <div>${manageAuthTokenField({ reload: reloadAuthTokens })}</div>
      <div>
        ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
        ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
      </div>

      ${tokensLoading && !Array.isArray(tokens) ? html`<div>...</div>` : null}
      ${tokensError ? html`<div>${tokensError.message}</div>` : null}

      ${Array.isArray(tokens)
        ? tokens.map(t => html.for(t, t.jti)`${authTokenList({ authToken: t, reload: reloadAuthTokens, onDelete: reloadAuthTokens })}`)
        : null}

      <div>
        ${before ? html`<a onclick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>` : null}
        ${after ? html`<a onclick=${onPageNav} href=${'./?' + afterParams}>later</span>` : null}
      </div>
    </dd>
  `
})
