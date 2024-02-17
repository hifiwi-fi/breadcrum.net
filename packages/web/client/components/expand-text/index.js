import { Component, html, useCallback, useState, useRef } from 'uland-isomorphic'
import { useWindow } from '../../hooks/useWindow.js'
import cn from 'classnames'

export const expandText = Component(({
  children,
  defaultExpandState,
  classNames = [],
  pre
}) => {
  const window = useWindow()
  const expandRef = useRef()
  const [expanded, setExpanded] = useState(defaultExpandState)

  const getSelectedText = useCallback(() => {
    const selection = window.getSelection()
    if (expandRef.current.contains(selection?.anchorNode)) {
      return selection?.toString()
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
      onclick="${handleClick}"
      class="${
        cn(
          'bc-epand-text',
          {
            'bc-expand-text-expanded': expanded,
            'bc-expand-text-pre': pre
          },
          ...classNames
        )
      }">
        ${children}
      </div>
  `
})
