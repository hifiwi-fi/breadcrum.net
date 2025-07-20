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
 *  user: TypeUserRead | null,
 *  onEdit?: () => void,
 * }) => any} UsernameView
 */

/**
 * @type {UsernameView}
 */
export const usernameView = Component(/** @type{UsernameView} */({ user, onEdit }) => {
  return html`
    <dt>username</dt>
    <dd>
      ${user?.username}
      <button onClick=${onEdit}>Edit</button>
    </dd>
  `
})
