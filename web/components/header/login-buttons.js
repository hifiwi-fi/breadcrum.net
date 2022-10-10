import { Component, html } from 'uland-isomorphic'
import { useFlags } from '../../hooks/useFlags.js'
import { useWindow } from '../../hooks/useWindow.js'

export const loginButtons = Component(() => {
  const { flags } = useFlags()
  const window = useWindow()

  return html`
    ${
      window?.location?.pathname !== '/login/'
        ? html`
          <div>
            <a href='/login'>login</a>
          </div>
        `
        : null
    }
    ${
      window?.location?.pathname !== '/login/' && window?.location?.pathname !== '/register/' && flags.registration
        ? html`
          <div>/</div>
        `
        : null
    }
    ${
      window?.location?.pathname !== '/register/' && flags.registration
        ? html`
          <div>
            <a href='/register'>register</a>
          </div>
        `
        : null
    }
    ${window?.location?.pathname === '/login/' && !flags.registration
      ? html`<div></div>`
      : null
    }
  `
})
