import { Component, html } from 'uland-isomorphic'

export const usernameView = Component(({ user, onEdit }) => {
  return html`
    <dt>username</dt>
    <dd>
      ${user?.username}
      <button onClick=${onEdit}>Edit</button>
    </dd>
  `
})
