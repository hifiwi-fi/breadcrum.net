/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */
import { html } from 'htm/preact'
import { useCallback, useEffect, useState } from 'preact/hooks'

import { useWindow } from '../../hooks/useWindow.js'

/**
 * @typedef {object} PwaUpdateDetail
 * @property {'worker'|'cache'} [kind]
 * @property {string} [version]
 */

const UPDATE_AVAILABLE_EVENT = 'breadcrum:pwa-update-available'
const UPDATE_CLEARED_EVENT = 'breadcrum:pwa-update-cleared'
const APPLY_UPDATE_EVENT = 'breadcrum:pwa-apply-update'
const DISMISS_UPDATE_EVENT = 'breadcrum:pwa-dismiss-update'

/** @type{FunctionComponent<{}>} */
export const PwaUpdateNotice = () => {
  const window = useWindow()
  const [update, setUpdate] = useState(/** @type {PwaUpdateDetail | null} */ (null))

  useEffect(() => {
    if (!window) return

    const handleUpdateAvailable = (/** @type {Event} */ ev) => {
      const detail = ev instanceof CustomEvent ? /** @type {PwaUpdateDetail} */ (ev.detail) : {}
      setUpdate(detail ?? {})
    }

    const handleUpdateCleared = () => {
      setUpdate(null)
    }

    window.addEventListener(UPDATE_AVAILABLE_EVENT, handleUpdateAvailable)
    window.addEventListener(UPDATE_CLEARED_EVENT, handleUpdateCleared)

    return () => {
      window.removeEventListener(UPDATE_AVAILABLE_EVENT, handleUpdateAvailable)
      window.removeEventListener(UPDATE_CLEARED_EVENT, handleUpdateCleared)
    }
  }, [window])

  const handleApplyUpdate = useCallback(() => {
    window?.dispatchEvent(new CustomEvent(APPLY_UPDATE_EVENT))
  }, [window])

  const handleDismissUpdate = useCallback(() => {
    setUpdate(null)
    window?.dispatchEvent(new CustomEvent(DISMISS_UPDATE_EVENT))
  }, [window])

  if (!update) return null

  return html`
    <div class="bc-header-service-notice bc-header-service-notice--pwa-update">
      <span>${update.kind === 'worker' ? 'App update available.' : 'Offline cache update available.'}</span>
      <button type="button" class="bc-header-service-notice-dismiss" onClick=${handleApplyUpdate}>Apply now</button>
      <button type="button" class="bc-header-service-notice-dismiss" onClick=${handleDismissUpdate}>Later</button>
    </div>
  `
}
