import { html, render } from 'uland-isomorphic'
import { header } from './components/header/index.js'

/*

THIS LAYOUT IS STATIC.
If you need to render components inside, you need attatch them in the global client.

*/

export default function defaultRootLayout ({
  title,
  siteName = 'breadcrum.net',
  scripts,
  styles,
  children,
  version
}) {
  return render(String, html`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${title ? `${title}` : ''}${title && siteName ? ' | ' : ''}${siteName}</title>
      <meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1'>
      <meta name='referrer' content='no-referrer'>
      <meta name='description' content='Breadcrum internet newspaper clippings and bookmarks. Podcast anything.'>

      <link rel="alternate" title="Breadcrum.net (JSON Feed)" type="application/json" href="/feed.json" />
      <link rel="alternate" title="Breadcrum.net (JSON Feed)" type="application/feed+json" href="/feed.json" />
      <link rel="alternate" title="Breadcrum.net (RSS Feed)" type="application/rss+xml"  href="/feed.xml" />
      <link rel="me" value="https://fosstodon.org/@breadcrum" />

      <link rel="shortcut icon" href="/static/bread-transformed.png">

      <link rel="icon" type="image/png" sizes="16x16" href="/static/favicons/favicon-16x16.png">
      <link rel="icon" type="image/png" sizes="32x32" href="/static/favicons/favicon-32x32.png">
      <link rel="icon" type="image/png" sizes="32x32" href="/static/favicons/favicon-96x96.png">

      <link rel="apple-touch-icon" sizes="57x57" href="/static/apple-icons/apple-icon-57x57.png">
      <link rel="apple-touch-icon" sizes="60x60" href="/static/apple-icons/apple-icon-60x60.png">
      <link rel="apple-touch-icon" sizes="72x72" href="/static/apple-icons/apple-icon-72x72.png">
      <link rel="apple-touch-icon" sizes="76x76" href="/static/apple-icons/apple-icon-76x76.png">
      <link rel="apple-touch-icon" sizes="114x114" href="/static/apple-icons/apple-icon-114x114.png">
      <link rel="apple-touch-icon" sizes="120x120" href="/static/apple-icons/apple-icon-120x120.png">
      <link rel="apple-touch-icon" sizes="144x144" href="/static/apple-icons/apple-icon-144x144.png">
      <link rel="apple-touch-icon" sizes="152x152" href="/static/apple-icons/apple-icon-152x152.png">
      <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-icons/apple-icon-180x180.png">
      <link rel="apple-touch-icon" href="/static/apple-icons/apple-touch-icon-180x180.png">

      <meta name="apple-mobile-web-app-title" content="Breadcrum">

      ${scripts
        ? scripts.map(script => html`<script type='module' src="${script}"></script>`)
        : null}
      ${styles
        ? styles.map(style => html`<link rel="stylesheet" href="${style}">`)
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
            <a href="/docs/">docs</a>
          </div>
          <div>
            <a href="/blog/">blog</a>
          </div>
          <div>
            <a href="/about/">@breadcrum</a>
          </div>
          <div>
            <a href="https://status.breadcrum.net">status</a>
          </div>
          <div>
            © <a href="https://hifiwi.fi">HifiWi.fi</a>
          </div>
          <div>
            <a href="https://github.com/hifiwi-fi/breadcrum.net/blob/master/LICENSE">
              AGPL-3.0-or-later
            </a>
          </div>
          <div>
            <a href="https://github.com/hifiwi-fi/breadcrum.net/releases/tag/v${version}">
              v${version}
            </a>
          </div>
          <a class="flex-center" href="/feed.json"><img class="rounded-icon" height="16" width="16" src="/static/jsonfeed.svg"></a>
          <a class="flex-center" href="/feed.xml"><img height="16" width="16" src="/static/atom.svg"></a>
        </footer>
      </div>
    </body>
    </html>
`)
}
