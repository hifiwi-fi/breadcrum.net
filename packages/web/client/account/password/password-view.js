/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js'
 */
// @ts-expect-error
import { Component, html } from 'uland-isomorphic'

/**
 * @typedef {({
 *  user,
 *  onEdit,
 * }: {
 *  user?: TypeUserRead | null,
 *  onEdit?: () => void,
 * }) => any} PasswordView
 */

/**
 * @type {PasswordView}
 */
export const passwordView = Component(/** @type{PasswordView} */({ onEdit }) => {
  return html`
    <dt>password</dt>
    <dd>
      **************
      <button onClick=${onEdit}>Edit</button>
    </dd>
  `
})
