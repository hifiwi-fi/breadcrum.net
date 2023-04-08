/* eslint-env browser */
import { Component, html, render, useState, useEffect } from 'uland-isomorphic'
import { useUser } from '../../hooks/useUser.js'
import { useLSP } from '../../hooks/useLSP.js'
import { useQuery } from '../../hooks/useQuery.js'

export const page = Component(() => {
  const state = useLSP()
  const { user, loading, error: userError } = useUser()
  const { query } = useQuery()
  const [resetting, setResetting] = useState(false)
  const [reset, setReset] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (user && !loading) window.location.replace('/account')
  }, [user])

  async function resetPassword (ev) {
    ev.preventDefault()
    setResetting(true)
    setErrorMessage(null)

    const password = ev.currentTarget.password.value
    const userID = query.get('user_id')
    const token = query.get('token')

    if (!userID) throw new Error('Missing userID in reset link. Did you modify the URL?')
    if (!token) throw new Error('Missing token in reset link. Did you modify the URL?')

    try {
      const response = await fetch(`${state.apiUrl}/user/password`, {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          password,
          userID,
          token: query.get('token')
        }),
        credentials: 'omit'
      })

      if (response.ok && response.status === 202) {
        await response.json()
        setReset(true)
      } else {
        throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
      }
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message)
    } finally {
      setResetting(false)
    }
  }

  return html`
    ${!user
      ? reset
        ? html`
          <div>
            New password set
          </div>
          <div>
            <a href="/login/">Log in</a>
          </div>
        `
        : html`
          <div class="bc-password-set">
            <form class="password-set-form" id="password-set-form" onsubmit=${resetPassword}>
            <fieldset ?disabled=${resetting}>
              <legend>Set new password</legend>
              <div>
                <label class="block">
                  Password:
                  <input class="block" type="password" name="password">
                </label>
              </div>
              <div class="button-cluster">
                <input name="submit-button" type="submit">
              </div>
              ${errorMessage || userError
                  ? html`<div class="error-box">${errorMessage} ${userError}</div>`
                  : null
              }
            </fieldset>
          </form>
        </div>
      `
      : html`
        <div>Logged in as ${user.username}</div>
        <div>Redirecting to <a href="/account">account</a></button>
        `
    }
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
