/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'

export const textIcon = Component(({ value }) => {
  return html`<span class='bc-text-icon'>${value}</span>`
})
