/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { defaultFrontendFlags } from '../../../../plugins/flags/frontend-flags.js'
import { defaultBackendFlags } from '../../../../plugins/flags/backend-flags.js'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useReload } from '../../hooks/useReload.js'

/**
 * @typedef {'boolean' | 'string'} FlagType
 * @typedef {{ type: 'boolean', default: boolean, description: string }} BooleanFlagMeta
 * @typedef {{ type: 'string', default: string, description: string }} StringFlagMeta
 * @typedef {BooleanFlagMeta | StringFlagMeta} FlagMeta
 * @typedef {Record<string, FlagMeta>} FlagDefinitions
 * @typedef {Record<string, boolean | string>} FlagValues
 */

/** @type {FlagDefinitions} */
const defaultFlags = /** @type {FlagDefinitions} */ ({
  ...defaultFrontendFlags,
  ...defaultBackendFlags,
})

const noticeMessageFlagConfig = /** @type {const} */ ({
  service_notice_message: {
    colorFlag: 'service_notice_message_color',
    colorLabel: 'Banner color',
  },
  service_notice_dismissible_message: {
    colorFlag: 'service_notice_dismissible_message_color',
    colorLabel: 'Dismissible banner color',
  },
})

const noticeColorPresets = /** @type {const} */ ([
  { label: 'Default', value: '' },
  { label: 'Email warning', value: 'var(--mark-background)' },
  { label: 'Disabled', value: 'red' },
  { label: 'Muted', value: 'var(--accent-midground)' },
  { label: 'Badge neutral', value: 'var(--accent-background)' },
  { label: 'Badge success', value: 'color-mix(in oklab, var(--bc-episodes-color) 28%, var(--background))' },
  { label: 'Badge warning', value: 'color-mix(in oklab, var(--bc-warning-color) 28%, var(--background))' },
  { label: 'Badge danger', value: 'color-mix(in oklab, var(--bc-danger-color) 28%, var(--background))' },
  { label: 'Sun', value: 'color-mix(in oklab, #f59e0b 35%, var(--background))' },
  { label: 'Amber', value: 'color-mix(in oklab, #f97316 35%, var(--background))' },
  { label: 'Rose', value: 'color-mix(in oklab, #f43f5e 32%, var(--background))' },
  { label: 'Mint', value: 'color-mix(in oklab, #10b981 28%, var(--background))' },
  { label: 'Sky', value: 'color-mix(in oklab, #3b82f6 28%, var(--background))' },
  { label: 'Lavender', value: 'color-mix(in oklab, #8b5cf6 28%, var(--background))' },
  { label: 'Slate', value: 'color-mix(in oklab, #64748b 24%, var(--background))' },
])

const colorInputFallback = '#ffffff'

/**
 * @typedef {keyof typeof noticeMessageFlagConfig} NoticeMessageFlagKey
 * @typedef {typeof noticeMessageFlagConfig[NoticeMessageFlagKey]} NoticeMessageFlagConfig
 */

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const { reload: reloadFlags, signal: flagsSignal } = useReload()

  const [serverFlags, setServerFlags] = useState(/** @type {FlagValues | null} */(null))
  const [serverFlagsLoading, setServerFlagsLoading] = useState(false)
  const [serverFlagsError, setServerFlagsError] = useState(/** @type {Error | null} */(null))

  const formRef = useRef(/** @type {HTMLFormElement | null} */(null))
  const noticeColorFlags = useMemo(
    () => /** @type {Set<string>} */ (
      new Set(Object.values(noticeMessageFlagConfig).map(entry => entry.colorFlag))
    ),
    []
  )

  useEffect(() => {
    const controller = new AbortController()

    async function getServerFlags () {
      setServerFlagsLoading(true)
      setServerFlagsError(null)

      const response = await fetch(`${state.apiUrl}/admin/flags`, {
        method: 'get',
        headers: {
          'accept-encoding': 'application/json',
        },
        signal: controller.signal,
      })

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json()
        setServerFlags(body)
      } else {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
      }
    }

    if (user) {
      getServerFlags()
        .then(() => { console.log('serverFlags done') })
        .catch(err => { console.error(err); setServerFlagsError(err) })
        .finally(() => { setServerFlagsLoading(false) })
    }
  }, [state.apiUrl, flagsSignal])

  async function handleFlagSave (/** @type {Event} */ev) {
    ev.preventDefault()
    setServerFlagsLoading(true)
    setServerFlagsError(null)

    try {
      const form = formRef.current
      if (!form) return

      /** @type {FlagValues} */
      const payload = {}
      for (const [flag, flagMeta] of Object.entries(defaultFlags)) {
        const formElement = form.elements.namedItem(flag)
        if (!(formElement instanceof HTMLInputElement)) continue

        if (flagMeta.type === 'boolean') {
          payload[flag] = formElement.checked
        } else {
          payload[flag] = formElement.value
        }
      }

      const response = await fetch(`${state.apiUrl}/admin/flags`, {
        method: 'put',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        console.log(await response.json())
      } else {
        const errorBody = await response.text()
        console.error(errorBody)
        setServerFlagsError(new Error(`Server error: ${errorBody}`))
      }
    } catch (err) {
      console.error(err)
      setServerFlagsError(/** @type {Error} */(err))
    } finally {
      setServerFlagsLoading(false)
      reloadFlags()
    }
  }

  return html`
    <div class="bc-admin-flags">
      <form ref=${formRef} disabled=${serverFlagsLoading} onsubmit=${handleFlagSave}>
        <fieldset disabled=${serverFlagsLoading}>
          <legend class="bc-admin-flags-legend">Admin flags</legend>
          ${serverFlagsLoading ? html`<p class="bc-admin-flags-status">loading...</p>` : null}
          <dl class="bc-admin-flags-list">
            ${Object.entries(defaultFlags)
              .filter(([flag]) => !noticeColorFlags.has(flag))
              .map(([flag, flagMeta]) => {
                const noticeConfig = getNoticeConfig(flag)
                if (noticeConfig) {
                  const rawColorMeta = defaultFlags[noticeConfig.colorFlag]
                  const colorFlagMeta = rawColorMeta?.type === 'string' ? rawColorMeta : undefined
                  const rawColorValue = serverFlags?.[noticeConfig.colorFlag]
                  const colorServerValue = typeof rawColorValue === 'string' ? rawColorValue : undefined
                  return html`<${NoticeMessageEntry}
                    key=${flag}
                    flag=${flag}
                    flagMeta=${flagMeta}
                    serverValue=${serverFlags?.[flag]}
                    disabled=${serverFlagsLoading}
                    colorFlag=${noticeConfig.colorFlag}
                    colorLabel=${noticeConfig.colorLabel}
                    colorFlagMeta=${colorFlagMeta}
                    colorServerValue=${colorServerValue}
                  />`
                }
                return html`<${FlagEntry}
                  key=${flag}
                  flag=${flag}
                  flagMeta=${flagMeta}
                  serverValue=${serverFlags?.[flag]}
                  disabled=${serverFlagsLoading}
                />`
              })
            }
          </dl>
          <div class="bc-admin-flags-actions">
            <div class="button-cluster">
              <input name="submit-button" type="submit" />
            </div>
          </div>
          ${serverFlagsError ? html`<p class="bc-admin-flags-error">${/** @type {Error} */(serverFlagsError).message}</p>` : null}
      </fieldset>
    </form>
    </div>
  `
}

/**
 * @typedef {{
 *   flag: string,
 *   flagMeta: FlagMeta,
 *   serverValue?: boolean | string,
 *   disabled: boolean
 * }} FlagEntryProps
 */

/**
 * @type {FunctionComponent<FlagEntryProps>}
 */
const FlagEntry = ({ flag, flagMeta, serverValue, disabled }) => {
  return html`
    <dt class="bc-admin-flags-term">
      <label class="bc-admin-flags-label" for=${flag}>${flag}</label>
    </dt>
    <dd class="bc-admin-flags-detail">
      <div class="bc-admin-flags-input-row">
        <${TypeMap}
          type=${flagMeta.type}
          disabled=${disabled}
          serverValue=${serverValue}
          defaultValue=${flagMeta.default}
          flag=${flag}
        />
      </div>
      <p class="bc-admin-flags-description">${flagMeta.description}</p>
    </dd>
  `
}

/**
 * @typedef {{
 *   flag: string,
 *   flagMeta: FlagMeta,
 *   serverValue?: boolean | string,
 *   disabled: boolean,
 *   colorFlag: string,
 *   colorLabel: string,
 *   colorFlagMeta: StringFlagMeta | undefined,
 *   colorServerValue?: string,
 * }} NoticeMessageEntryProps
 */

/**
 * @type {FunctionComponent<NoticeMessageEntryProps>}
 */
const NoticeMessageEntry = ({
  flag,
  flagMeta,
  serverValue,
  disabled,
  colorFlag,
  colorLabel,
  colorFlagMeta,
  colorServerValue,
}) => {
  const colorInputRef = useRef(/** @type {HTMLInputElement | null} */(null))
  const colorValueRef = useRef(/** @type {HTMLInputElement | null} */(null))

  const normalizedColor = useMemo(() => {
    const fallbackColor = colorFlagMeta?.default ?? ''
    return normalizeColorValue(colorServerValue ?? fallbackColor)
  }, [colorServerValue, colorFlagMeta?.default])

  const pickerValue = normalizedColor || colorInputFallback

  const handleColorPick = useCallback((/** @type {Event} */ event) => {
    const target = event.currentTarget
    if (!(target instanceof HTMLInputElement)) return
    if (!colorValueRef.current) return
    colorValueRef.current.value = target.value
  }, [])

  const handlePresetClick = useCallback((/** @type {string} */ value) => {
    return () => {
      if (colorValueRef.current) {
        colorValueRef.current.value = value
      }
      if (colorInputRef.current) {
        const normalizedPreset = normalizeColorValue(value)
        colorInputRef.current.value = normalizedPreset || colorInputFallback
      }
    }
  }, [])

  return html`
    <dt class="bc-admin-flags-term">
      <label class="bc-admin-flags-label" for=${flag}>${flag}</label>
    </dt>
    <dd class="bc-admin-flags-detail">
      <div class="bc-admin-flags-input-row">
        <${TypeMap}
          type=${flagMeta.type}
          disabled=${disabled}
          serverValue=${serverValue}
          defaultValue=${flagMeta.default}
          flag=${flag}
        />
      </div>
      <div class="bc-admin-flags-color-row">
        <label class="bc-admin-flags-color-title" for=${colorFlag}>${colorLabel}</label>
        <div class="bc-admin-flags-color-controls">
          <input
            class="bc-admin-flags-input bc-admin-flags-color-input"
            id=${colorFlag}
            name=${colorFlag}
            disabled=${disabled}
            ref=${colorValueRef}
            placeholder="Default"
            defaultValue=${colorServerValue ?? colorFlagMeta?.default ?? ''}
          />
          <input
            class="bc-admin-flags-color-picker"
            type="color"
            disabled=${disabled}
            ref=${colorInputRef}
            defaultValue=${pickerValue}
            onInput=${handleColorPick}
            aria-label=${`${flag} color picker`}
          />
        </div>
        <div class="bc-admin-flags-color-presets" role="group" aria-label="${flag} color presets">
          ${noticeColorPresets.map(({ label, value }) => {
            const chipStyle = value ? `background-color: ${value};` : ''
            return html`
              <button
                type="button"
                class="bc-admin-flags-color-chip"
                style=${chipStyle}
                disabled=${disabled}
                onClick=${handlePresetClick(value)}
              >
                ${label}
              </button>
            `
          })}
        </div>
        <p class="bc-admin-flags-color-help">Leave blank to use the default banner color.</p>
      </div>
      <p class="bc-admin-flags-description">${flagMeta.description}</p>
    </dd>
  `
}

/**
 * @typedef {{
 *   type: FlagType,
 *   disabled: boolean,
 *   flag: string,
 *   serverValue?: boolean | string,
 *   defaultValue: boolean | string
 * }} TypeMapProps
 */

/**
 * @type {FunctionComponent<TypeMapProps>}
 */
const TypeMap = ({ type, disabled, flag, serverValue, defaultValue }) => {
  switch (type) {
    case 'boolean': {
      return html`<input class="bc-admin-flags-checkbox" id=${flag} disabled=${disabled} type='checkbox' name=${flag} checked=${serverValue ?? defaultValue} />`
    }
    default: {
      return html`<input class="bc-admin-flags-input" id=${flag} disabled=${disabled} name=${flag} defaultValue=${serverValue ?? defaultValue} />`
    }
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeColorValue (value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map(char => `${char}${char}`).join('')}`
  }
  return ''
}

/**
 * @param {string} flag
 * @returns {NoticeMessageFlagConfig | null}
 */
function getNoticeConfig (flag) {
  if (flag in noticeMessageFlagConfig) {
    return noticeMessageFlagConfig[/** @type {NoticeMessageFlagKey} */(flag)]
  }
  return null
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
