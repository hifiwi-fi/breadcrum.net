/* eslint-env browser */
import { Component, html, render, useState, useEffect } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'
import { useLSP } from '../hooks/useLSP.js'
import { useQuery } from '../hooks/useQuery.js'

export const page = Component(() => {
  const state = useLSP()
  const { query } = useQuery()
  const { user, loading, error: userError } = useUser()
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (!user && !loading) {
      const redirectTarget = `${window.location.pathname}${window.location.search}`
      window.location.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
    }
  }, [user])

  useEffect(() => {
    async function confirmEmail () {
      setConfirming(true)
      setErrorMessage(null)

      const token = query.get('token')

      if (!token) throw new Error('Missing email confirmation token')
      if (token.length !== 64) throw new Error('Invalid token')

      const update = JSON.parse(query.get('update'))

      try {
        const response = await fetch(`${state.apiUrl}/user/email:verify`, {
          method: 'post',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({ token, update })
        })

        if (response.ok && response.status === 202) {
          const body = await response.json()
          setConfirmed(true)
        } else {
          throw new Error(`${response.status} ${response.statusText} ${await response.text()}`)
        }
      } catch (err) {
        console.error(err)
        setErrorMessage(err.message)
      } finally {
        setConfirming(false)
      }
    }

    confirmEmail()
  }, [])

  return html`
    ${user
      ? confirmed
        ? html`
          <div>
            ${query && JSON.parse(query.get('update'))
              ? 'Email address successfully updated!'
              : 'Email address confirmed!'
            }
          </div>
        `
        : html`
          <div class="bc-confirm-email">
            ${query
              ? html`
                ${!query.get('token') ? html`<div>Missing email confirm token<div>` : null}
                ${query.get('token')?.length !== 64 ? html`<div>Invalid email confirmation token<div>` : null}
              `
              : null
            }
            ${confirming ? html`<div>Confirming email address...</div>` : null}
            ${errorMessage || userError
                  ? html`<div class="error-box">${errorMessage} ${userError}</div>`
                  : null
              }
          </div>
      `
      : html`
        <div>Please login to confirm your email address.</div>
        <div>Redirecting to <a href="/login?redirect=TODO">login</a></button>
        `
    }
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
