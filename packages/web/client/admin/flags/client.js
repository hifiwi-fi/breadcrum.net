/// <reference lib="dom" />
/* eslint-env browser */

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
import { useEffect, useState, useRef } from 'preact/hooks'
import { defaultFrontendFlags } from '../../../plugins/flags/frontend-flags.js'
import { defaultBackendFlags } from '../../../plugins/flags/backend-flags.js'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useReload } from '../../hooks/useReload.js'

const defaultFlags = { ...defaultFrontendFlags, ...defaultBackendFlags }

/** @type {FunctionComponent} */
export const Page = () => {
  const state = useLSP()
  const { user } = useUser()
  const { reload: reloadFlags, signal: flagsSignal } = useReload()

  const [serverFlags, setServerFlags] = useState()
  const [serverFlagsLoading, setServerFlagsLoading] = useState(false)
  const [serverFlagsError, setServerFlagsError] = useState(/** @type {Error | null} */(null))

  const formRef = useRef()

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
      const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
      if (!form) return

      /** @type {Record<string, any>} */
      const payload = {}
      for (const [flag, flagMeta] of Object.entries(defaultFlags)) {
        const formElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem(flag))
        if (!formElement) continue

        if (flagMeta.type === 'boolean') {
          if (formElement.checked !== flagMeta.default) {
            payload[flag] = formElement.checked
          }
        } else {
          if (formElement.value !== flagMeta.default) {
            payload[flag] = formElement.value
          }
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
      ${serverFlagsLoading ? html`<p>loading...</p>` : null}
      <form ref=${formRef} disabled=${serverFlagsLoading} onsubmit=${handleFlagSave}>
        <fieldset disabled=${serverFlagsLoading}>
          <legend class="bc-admin-flags-legend">Admin flags</legend>
          ${Object.entries(defaultFlags).map(([flag, flagMeta]) => {
              return html`<${FlagEntry}
                key=${flag}
                flag=${flag}
                flagMeta=${flagMeta}
                serverValue=${serverFlags?.[flag]}
                disabled=${serverFlagsLoading}
              />`
            })
          }
        <div class="button-cluster">
            <input name="submit-button" type="submit" />
        </div>
        ${serverFlagsError ? html`<p>${/** @type {Error} */(serverFlagsError).message}</p>` : null}
      </fieldset>
    </form>
    </div>
  `
}

/**
 * @typedef {{
 *   flag: string,
 *   flagMeta: { type: string, description: string, default: any },
 *   serverValue?: any,
 *   disabled: boolean
 * }} FlagEntryProps
 */

/**
 * @type {FunctionComponent<FlagEntryProps>}
 */
const FlagEntry = ({ flag, flagMeta, serverValue, disabled }) => {
  return html`
    <div>
      <label class='block'>
        ${flag}
        <${TypeMap}
          type=${flagMeta.type}
          disabled=${disabled}
          serverValue=${serverValue}
          defaultValue=${flagMeta.default}
          flag=${flag}
        />
      </label>
      <p>${flagMeta.description}</p>
    </div>
  `
}

/**
 * @typedef {{
 *   type: string,
 *   disabled: boolean,
 *   flag: string,
 *   serverValue?: any,
 *   defaultValue: any
 * }} TypeMapProps
 */

/**
 * @type {FunctionComponent<TypeMapProps>}
 */
const TypeMap = ({ type, disabled, flag, serverValue, defaultValue }) => {
  switch (type) {
    case 'boolean': {
      return html`<input disabled=${disabled} type='checkbox' name=${flag} checked=${serverValue ?? defaultValue} />`
    }
    default: {
      return html`<input disabled=${disabled} name=${flag} value=${serverValue ?? defaultValue} />`
    }
  }
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
