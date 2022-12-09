import { Component, html } from 'uland-isomorphic'

export const passwordView = Component(({ user, onEdit }) => {
  return html`
    <dt>password</dt>
    <dd>
      **************
      <button onClick=${onEdit}>Edit</button>
    </dd>
  `
})
