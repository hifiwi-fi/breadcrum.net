/// <reference lib="dom" />

import { useEffect } from 'preact/hooks'
import { useWindow } from './useWindow.js'

const sep = ' | '

/**
 *
 * @param  {...string} parts The parts of the title you want
 */
export function useTitle (...parts) {
  const window = useWindow()

  useEffect(() => {
    if (parts.length > 0 && window) {
      window.document.title = [parts.join(' '), window.document.title.split(sep)[1]].join(sep)
    }
  }, [...parts])
}
