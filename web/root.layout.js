import { html, render } from 'uland-isomorphic'
import { header } from './components/header.js'

export default function defaultRootLayout ({
  title,
  siteName = 'breadcrum.net',
  scripts,
  styles,
  children
}) {
  return render(String, html`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title ? `${title}` : ''}${title && siteName ? ' | ' : ''}${siteName}</title>
      <meta name='viewport' content='initial-scale=1, viewport-fit=cover'>
      ${scripts
        ? scripts.map(script => html`<script type='module' src="${script}"></script>`)
        : null}
      ${styles
        ? styles.map(style => html`<link rel="stylesheet" href=${style} />`)
        : null}
    </head>
    <body class="bc-body">
      <div class="bc-page-container">
        <header class="bc-header">
          ${header()}
        </header>
        <main class="bc-main">
          ${typeof children === 'string' ? html([children]) : children /* Support both uhtml and string children. Optional. */}
        </main>
        <footer class="bc-footer">
          <div>
            © <a href="https://hifiwi.fi">HifiWi.fi</a>
          </div>
          <div>
            <a href="https://twitter.com/breadcrum_">@breadcrum_</a>
          </div>
          <div>
            <a href="https://github.com/hifiwi-fi/breadcrum.net/">
              AGPL-3.0-or-later
            </a>
        </div>
        </footer>
      </div>
    </body>
    </html>
`)
}
