/* eslint-env browser */
import { Component, html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'
import { useFlags } from '../hooks/useFlags.js'

export const page = Component(() => {
  const { user, loading, error: userError } = useUser()
  const state = useLSP()
  const [submitting, setSubmitting] = useState(false)
  const { flags, loading: flagsLoading } = useFlags()
  const [registerError, setRegisterError] = useState(null)

  useEffect(() => {
    if ((user && !loading)) {
      window.location.replace('/docs')
    }
  }, [user])

  async function onRegister (ev) {
    ev.preventDefault()
    setSubmitting(true)
    setRegisterError(null)

    try {
      const email = ev.currentTarget.email.value
      const username = ev.currentTarget.username.value
      const password = ev.currentTarget.password.value
      const newsletter = ev.currentTarget.newsletter.checked

      const response = await fetch(`${state.apiUrl}/register`, {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ email, username, password, newsletter })
      })

      if (response.ok && response.status === 201) {
        const user = await response.json()
        state.user = user
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.log(err)
      setSubmitting(false)
      setRegisterError(err)
    }
  }

  return html`
    <div class="bc-register">
      <form class="register-form" id="register-form" onsubmit=${onRegister}>
      <fieldset ?disabled="${Boolean(user) || submitting || !flags.registration || flagsLoading}">
        <legend>${flags.registration ? 'Register:' : 'Registration closed. Please come back soon!'}</legend>
        <div>
          <label class="block">
            Email:
            <input class="block" type="email" name="email" />
          </label>
        </div>
        <div>
          <label class="block">
            Username:
            <input class="block" pattern="^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$" minlength="1" maxlength="50" type="text" name="username" />
          </label>
        </div>
        <div>
          <label class="block">
            Password:
            <input class="block" type="password" name="password">
          </label>
        </div>
        <div>
          <label class="checkbox-label">
            <input type="checkbox" name="newsletter">
            Subscribe to news and updates
          </label>
        </div>
        <div class="button-cluster">
          <input name="submit-button" type="submit">
        </div>
      </fieldset>
    </form>
  </div>
  ${userError
    ? html`<div>${userError?.message}</div>`
    : null
  }
  ${registerError ? html`<p>${registerError.message}</p>` : null}
`
})

try {
  render(document.querySelector('.bc-main'), page)
} catch {
  // swallow
}
