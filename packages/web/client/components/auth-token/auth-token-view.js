/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeAuthTokenRead } from '../../../routes/api/user/auth-tokens/schemas/schema-auth-token-read.js';
*/

// @ts-expect-error
import { Component, html } from 'uland-isomorphic'

/**
 * @typedef {({
 *  authToken,
 *  onEdit,
 * }: {
 *  authToken: TypeAuthTokenRead,
 *  onEdit?: () => void,
 * }) => any} AuthTokenView
 */

/**
  * @type {AuthTokenView}
  */
export const authTokenView = Component(/** @type{AuthTokenView} */({
  authToken: t,
  onEdit = () => {},
}) => {
  return html`
    <div class="bc-auth-token-view">
      <div>
        <pre>
          ${JSON.stringify(t, null, 2)}
        </pre>
      </div>
      <div>
        <button onClick=${onEdit}>Edit</button>
      </div>
    </div>`
})
