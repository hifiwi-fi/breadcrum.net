/* eslint-env browser */
import { Component, html, render, useEffect, useState, useRef } from 'uland-isomorphic'
import { defaultFrontendFlags } from '../../../plugins/flags/frontend-flags.js'
import { defaultBackendFlags } from '../../../plugins/flags/backend-flags.js'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'

const defaultFlags = { ...defaultFrontendFlags, ...defaultBackendFlags }

export const page = Component(() => {
  const state = useLSP()
  const { user, loading } = useUser()

  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user])

  const [serverFlags, setServerFlags] = useState()
  const [serverFlagsLoading, setServerFlagsLoading] = useState(false)
  const [serverFlagsError, setServerFlagsError] = useState(false)

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
  }, [state.apiUrl])

  async function handleFlagSave (ev) {
    ev.preventDefault()
    setServerFlagsLoading(true)
    setServerFlagsError(null)

    try {
      const form = formRef.current
      const payload = {}
      for (const [flag, flagMeta] of Object.entries(defaultFlags)) {
        if (flagMeta.type === 'boolean') {
          if (form[flag].checked !== defaultFlags[flag].default) {
            payload[flag] = form[flag].checked
          }
        } else {
          if (form[flag].value !== defaultFlags[flag].default) {
            payload[flag] = form[flag].value
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
      setServerFlagsError(err)
    } finally {
      setServerFlagsLoading(false)
    }
  }

  return html`
    <div class="bc-admin-flags">
      ${serverFlagsLoading ? html`<p>loading...</p>` : null}
      <form ref='${formRef}' ?disabled='${serverFlagsLoading}' onsubmit=${handleFlagSave}>
        <fieldset ?disabled=${serverFlagsLoading}>
          <legend class="bc-admin-flags-legend">Admin flags</legend>
          ${Object.entries(defaultFlags).map(([flag, flagMeta]) => {
              return html.for(flagMeta, flag)`${flagEntry({
                flag,
                flagMeta,
                serverValue: serverFlags?.[flag],
                disabled: serverFlagsLoading,
              })}`
            })
          }
        <div class="button-cluster">
            ${handleFlagSave ? html`<input name="submit-button" type="submit">` : null}
        </div>
        ${serverFlagsError ? html`<p>${serverFlagsError.message}</p>` : null}
      </fieldset>
    </form>
  </div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}

function flagEntry ({
  flag,
  flagMeta,
  serverValue,
  disabled,
}) {
  return html`
  <div>
    <label class='block'>
      ${flag}
      ${typeMap({ type: flagMeta.type, disabled, serverValue, defaultValue: flagMeta.default, flag })}
    </label>
    <p>${flagMeta.description}</p>
  </div>
  `
}

function typeMap ({ type, disabled, flag, serverValue, defaultValue }) {
  switch (type) {
    case 'boolean': {
      return html`<input ?disabled='${disabled}' type='checkbox' name='${flag}' ?checked=${serverValue ?? defaultValue}></input>`
    }
    default: {
      return html`<input ?disabled='${disabled}' name=${flag} value=${serverValue ?? defaultValue}></input>`
    }
  }
}
