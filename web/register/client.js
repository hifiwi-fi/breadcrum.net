/* eslint-env browser */
import { html, render, useEffect, useState } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'

export function register () {
  const { user, loading, error: userError } = useUser()
  const state = useLSP()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (state.disableRegistration) window.location.replace('/')
  }, [state.disableRegistration])

  useEffect(() => {
    if ((user && !loading)) window.location.replace('/bookmarks')
  }, [user])

  async function onRegister (ev) {
    ev.preventDefault()
    setSubmitting(true)
    try {
      const email = ev.currentTarget.email.value
      const username = ev.currentTarget.username.value
      const password = ev.currentTarget.password.value

      const response = await fetch(`${state.apiUrl}/register`, {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, username, password })
      })

      if (response.ok && response.status === 201) {
        const user = await response.json()
        state.user = user
      }
    } catch (err) {
      console.log(err)
      setSubmitting(false)
    }
  }

  return html`
    <div>
      <form class="register-form" id="register-form" onsubmit=${onRegister}>
      <fieldset ?disabled="${Boolean(user) || submitting}">
        <legend>Register:</legend>
        <div>
          <label>
            Email:
            <input type="email" name="email" />
          </label>
        </div>
        <div>
          <label>
            Username:
            <input pattern="^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$" minlength="1" maxlength="50" type="text" name="username" />
          </label>
        </div>
        <div>
          <label>
            Password:
            <input type="password" name="password">
          </label>
        </div>
        <div class="button-cluster">
          <input name="submit-button" type="submit">
        </div>
        <div class="error-box"></div>
      </fieldset>
    </form>
  </div>
  ${userError
    ? html`<div>${userError?.message}</div>`
    : null
  }
`
}

try {
  render(document.querySelector('.bc-main'), register)
} catch {
  // swallow
}
