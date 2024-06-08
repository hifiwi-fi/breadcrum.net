import { Component, html } from 'uland-isomorphic'
import cn from 'classnames'

export const star = Component(({
  starred = false,
  onclick = () => {},
}) => {
  return html`
    <span class="${cn({ 'bc-starred': starred, 'bc-unstarred': !starred, 'bc-star': true })}" onclick=${onclick}>
      ${starred
        ? '★'
        : '☆'
        }
    </span>`
})
