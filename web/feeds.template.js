import pMap from 'p-map'
import jsonfeedToAtom from 'jsonfeed-to-atom'

export default async function * feedsTemplate (args) {
  const {
    vars: {
      siteName,
      siteDescription,
      host,
      transport,
      authorName,
      authorUrl,
      authorImgUrl
    },
    pages
  } = args
  const blogPosts = pages
    .filter(page => page.vars.layout === 'article')
    .sort((a, b) => new Date(b.vars.publishDate) - new Date(a.vars.publishDate))
    .slice(0, 10)

  const baseUrl = `${transport}://${host}`

  const jsonFeed = {
    version: 'https://jsonfeed.org/version/1',
    title: siteName,
    home_page_url: baseUrl,
    feed_url: `${baseUrl}/feed.json`,
    description: siteDescription,
    author: {
      name: authorName,
      url: authorUrl,
      avatar: authorImgUrl
    },
    items: await pMap(blogPosts, async (page) => {
      return {
        date_published: page.vars.publishDate,
        title: page.vars.title,
        url: `${baseUrl}/${page.page.path}/`,
        id: `${baseUrl}/${page.page.path}/#${page.vars.publishDate}`,
        content_html: await page.renderInnerPage({ pages })
      }
    }, { concurrency: 4 })
  }

  yield {
    content: JSON.stringify(jsonFeed, null, '  '),
    outputName: 'feed.json'
  }

  yield {
    content: jsonfeedToAtom(jsonFeed),
    outputName: 'feed.xml'
  }
}
