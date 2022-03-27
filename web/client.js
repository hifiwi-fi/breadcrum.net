/* eslint-env browser */
import { html, render, useState } from 'uland-isomorphic'
import { useUser } from './hooks/useUser.js'
import { useLSP } from './hooks/useLSP.js'

export function homepage () {
  const state = useLSP()
  const { user, loading, error: userError } = useUser()
  const [loggingOut, setLoggingOut] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)

  // console.log({ state, user, loading, userError })

  async function logout (ev) {
    ev.preventDefault()
    setLoggingOut(true)

    try {
      await fetch(`${state.apiUrl}/logout`, {
        method: 'post',
        credentials: 'include'
      })

      state.user = null
    } catch (err) {
      console.log(err)
    } finally {
      setLoggingOut(false)
    }
  }

  async function login (ev) {
    ev.preventDefault()
    setLoggingIn(true)

    const user = ev.currentTarget.user.value
    const password = ev.currentTarget.password.value

    try {
      const response = await fetch(`${state.apiUrl}/login`, {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ user, password }),
        credentials: 'include'
      })

      if (response.ok && response.status === 201) {
        const user = await response.json()
        state.user = user
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.log(err)
    } finally {
      setLoggingIn(false)
    }
  }

  return html`
    ${!user
      ? html`
        <div>
        <form class="login-form" id="login-form" onsubmit=${login}>
        <fieldset ?disabled=${loggingIn}>
          <legend>Log in:</legend>
          <div>
            <label>
              Email or Username:
              <input type="text" name="user" />
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
      <div>
        <a href='/register'>Register</a>
      </div>
      `
      : null
    }
    ${user
      ? html`
        <div>Logged in as ${user.username}</div>
        <div><button onclick=${logout} ?disabled=${loggingOut}>Logout</button>
        `
      : null
    }
    ${userError
      ? html`<div>${JSON.stringify(userError, null, ' ')}</div>`
      : null
    }
    ${
      loading
        ? html`<div>loading</div>`
        : null
    }
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), homepage)
}
