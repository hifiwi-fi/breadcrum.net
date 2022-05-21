import { html } from 'uland-isomorphic'

export function star (starred = false, onClick = () => {}) {
  return html`
    <span onClick=${onClick} class="${starred ? 'bc-starred' : 'bc-unstarred'}" onClick=${onClick}>
      ${starred
        ? '★'
        : '☆'
        }
    </span>`
}
