import { Component, html } from 'uland-isomorphic'

export const star = Component(({
  starred = false,
  onClick = () => {}
}) => {
  return html`
    <span onClick=${onClick} class="${starred ? 'bc-starred' : 'bc-unstarred'}" onClick=${onClick}>
      ${starred
        ? '★'
        : '☆'
        }
    </span>`
})
