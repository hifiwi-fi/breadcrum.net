/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import { useState, useCallback, useEffect, useRef } from 'preact/hooks'

/** @type {FunctionComponent<{
 * src: string
 * type: string
 * clickForPreview?: boolean
 * thumbnail?: string
}>} */
export const CorsMedia = ({
  src,
  type,
  clickForPreview,
  thumbnail,
}) => {
  const [previewActive, setPreviewActive] = useState(!clickForPreview)
  const [hadCorsError, setHadCorsError] = useState(false)
  const ref = useRef(/** @type {HTMLVideoElement | HTMLAudioElement | null} */(null))

  const handlePreviewClick = useCallback(() => {
    setPreviewActive(true)
  }, [setPreviewActive])

  const handleKeydown = useCallback((/** @type {KeyboardEvent} */ ev) => {
    if (ev.key === 'Enter') {
      setPreviewActive(true)
    }
  }, [setPreviewActive])

  const handlePlayKeys = useCallback((/** @type {KeyboardEvent} */ ev) => {
    const el = ref?.current
    if (ev.key === 'Enter' && el) {
      if (el.paused) el.play()
      else el.pause()
    }
  }, [ref])

  const onerror = useCallback((/** @type {Event} */ev) => {
    const target = /** @type {HTMLVideoElement | HTMLAudioElement} */ (ev?.currentTarget)
    if (target?.error?.code === 4) {
      if (!hadCorsError) {
        setHadCorsError(true)
        ref?.current?.setAttribute('crossorigin', 'anonomous')
        ref?.current?.load()
        ref?.current?.play()
        ref?.current?.focus()
      }
    }
  }, [ref, hadCorsError])

  useEffect(() => {
    if (previewActive && clickForPreview) {
      ref?.current?.play()
      ref?.current?.focus()
    }
  }, [previewActive])

  return html`
  <div>
    ${previewActive && ['video', 'audio'].includes(type)
      ? type === 'video'
        ? html`<video onKeyDown="${handlePlayKeys}" ref="${ref}" class="bc-cors-video" onError="${onerror}" control src="${src}" preload="none" poster="${thumbnail}">
                  <a href="${src}">View video</a>
              </video>`
        : html`
              <audio onKeyDown="${handlePlayKeys}" ref="${ref}" class="bc-cors-audio" onError="${onerror}" controls src="${src}" preload="none">
                <a href="${src}">View audio</a>
              </audio>`
      : null
    }
    ${!previewActive
      ? thumbnail
        ? html`
          <div class="bc-cors-media-thumbnail-group" tabindex="0" role="button" aria-pressed="false" onClick="${handlePreviewClick}" onKeyDown="${handleKeydown}">
            <img class='bc-cors-media-thumbnail' src="${thumbnail}" />
          </div>`
        : html`<div onKeyDown="${handleKeydown}" tabindex="0" role="button" aria-pressed="false" onClick="${handlePreviewClick}" class='bc-cors-media-placeholder'><${PlayIcon} /></div>`
      : null
    }
  </div>
  `
}

/** @type {FunctionComponent} */
const PlayIcon = () => html`
<svg width="11px" height="13px" viewBox="0 0 11 13" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <path fill="var(--accent-foreground)" d="M0.967370794,12.5643525 C1.25384013,12.5643525 1.49732146,12.4497692 1.78379079,12.2850567 L10.1340375,7.45823467 C10.7284481,7.10732 10.9361281,6.87815333 10.9361281,6.49859467 C10.9361281,6.119036 10.7284481,5.88986933 10.1340375,5.54612667 L1.78379079,0.71214 C1.49732146,0.547433333 1.25384013,0.44 0.967370794,0.44 C0.437434794,0.44 0.108006794,0.841045333 0.108006794,1.4641 L0.108006794,11.5331031 C0.108006794,12.1561499 0.437434794,12.5643525 0.967370794,12.5643525 Z"/>
</svg>
`
