/// <reference lib="dom" />
/* eslint-env browser */

// @ts-expect-error
import { Component, html, useCallback } from 'uland-isomorphic'
import { useAuthTokens } from '../../hooks/useAuthTokens.js'
import { authTokenList } from '../../components/auth-token/auth-token-list.js'
import { useQuery } from '../../hooks/useQuery.js'
import { useWindow } from '../../hooks/useWindow.js'

/**
 * @typedef {() => any} DisabledField
 */

/**
 * @type {DisabledField}
 */
export const authTokens = Component(/** @type{DisabledField} */() => {
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
