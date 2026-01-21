/// <reference lib="dom" />

/**
 * @import { FunctionComponent, ComponentChild } from 'preact'
 */

import { html } from 'htm/preact'
import { useCallback, useState, useRef } from 'preact/hooks'
import { useWindow } from '../../hooks/useWindow.js'
import cn from 'classnames'

/**
 * @typedef {object} ExpandTextProps
 * @property {ComponentChild} children
 * @property {boolean} [defaultExpandState]
 * @property {string[]} [classNames]
 * @property {boolean} [pre]
 */

/**
 * @type {FunctionComponent<ExpandTextProps>}
 */
export const ExpandText = ({
  children,
  defaultExpandState,
  classNames = [],
  pre,
}) => {
  const window = useWindow()
  const expandRef = useRef(/** @type {HTMLDivElement | null} */(null))
  const [expanded, setExpanded] = useState(defaultExpandState)

  const getSelectedText = useCallback(() => {
    const selection = window?.getSelection()
    if (expandRef.current && selection && expandRef.current.contains(selection.anchorNode)) {
      return selection.toString()
    }
    return ''
  }, [expandRef, window])

  const handleClick = useCallback(() => {
    if (getSelectedText() === '') {
      setExpanded(!expanded)
    }
  }, [setExpanded, expanded])

  return html`
    <div
      ref="${expandRef}"
      onClick="${handleClick}"
      class="${
        cn(
          'bc-epand-text',
          {
            'bc-expand-text-expanded': expanded,
            'bc-expand-text-pre': pre,
          },
          ...classNames
        )
      }">
        ${children}
      </div>
  `
}
