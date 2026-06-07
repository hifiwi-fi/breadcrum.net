import { createTemplateContext } from './template-context.js'

export default async function * serviceWorkerTemplate () {
  const context = await createTemplateContext()

  yield {
    content: `self.addEventListener('install', (event) => {
  console.log('Service worker installed')
})
`,
    outputName: 'service-worker.js',
  }

  yield {
    content: JSON.stringify({
      id: '/bookmarks/',
      name: context.siteName,
      short_name: context.siteName,
      lang: 'en',
      dir: 'ltr',
      categories: ['productivity', 'utilities', 'social'],
      description: context.siteDescription,
      start_url: '/bookmarks/',
      display: 'minimal-ui',
      theme_color: context.themeColorLight,
      background_color: '#ffffff',
      screenshots: [
        {
          src: '/static/screenshots/bookmark-window-light.png',
          sizes: '1730x2724',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Bookmark listing showing bookmarks with episodes and archives',
        },
        {
          src: '/static/screenshots/feed-window-light.png',
          sizes: '1794x1728',
          type: 'image/png',
          form_factor: 'wide',
          label: 'Feed listing showing episodes sent to a podcast app',
        },
      ],
      icons: [
        {
          src: '/static/breadcrum-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/static/breadcrum-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/static/apple-icons/apple-icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      share_target: {
        action: '/bookmarks/add/',
        method: 'GET',
        params: {
          title: 'title',
          text: 'summary',
          url: 'url',
        },
      },
    }, null, 2),
    outputName: 'manifest.webmanifest',
  }
}
