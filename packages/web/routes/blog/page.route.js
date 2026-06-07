/**
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { RenderedMarkdownPage } from '../content/markdown.js'
 * @import { BlogPostSummary } from './blog-posts.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { loadMarkdownPage, markdownFilePath } from '../content/markdown.js'
import { contentSegmentsFromRequest, routePathFromSegments } from '../content/route-utils.js'
import { articleHeader, breadcrumb, dateText, markdownContent } from '../content/view-components.js'
import { loadBlogPosts, loadBlogYears } from './blog-posts.js'

/**
 * @typedef {object} BlogPageState
 * @property {'index' | 'year' | 'article' | 'notFound'} kind
 * @property {string[]} pathSegments
 * @property {BlogPostSummary[]} [posts]
 * @property {string[]} [years]
 * @property {string} [year]
 */

/**
 * @typedef {object} BlogPageData
 * @property {ViewContext} context
 * @property {RenderedMarkdownPage | null} contentPage
 * @property {BlogPageState} blogPage
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<BlogPageData | undefined>}
 */
export async function load ({ request, reply }) {
  if (!request || !reply) throw new Error('Blog page requires a Fastify request')

  const { segments, redirectPath } = contentSegmentsFromRequest(request, '/blog')
  if (redirectPath) {
    reply.redirect(redirectPath, 301)
    return
  }

  const context = await createRouteViewContext(request.server, request, {
    title: 'Blog',
  })
  const posts = await loadBlogPosts()
  const years = await loadBlogYears()

  if (segments.length === 0) {
    return {
      context: {
        ...context,
        title: 'Breadcrum.net Blog',
        noindex: true,
      },
      contentPage: null,
      blogPage: {
        kind: 'index',
        pathSegments: ['blog'],
        posts: posts.slice(0, 50),
        years,
      },
    }
  }

  if (segments.length === 1 && /^\d{4}$/.test(segments[0] ?? '')) {
    const year = segments[0] ?? ''
    return {
      context: {
        ...context,
        title: `All ${year} Blog Posts`,
        noindex: true,
      },
      contentPage: null,
      blogPage: {
        kind: 'year',
        pathSegments: ['blog', year],
        posts: posts.filter(post => post.year === year),
        years,
        year,
      },
    }
  }

  if (segments.length === 2 && /^\d{4}$/.test(segments[0] ?? '')) {
    const page = await loadMarkdownPage({
      filePath: markdownFilePath('blog', segments),
      routePath: routePathFromSegments('/blog', segments),
      context,
    })

    if (page) {
      return {
        context: {
          ...context,
          title: page.title,
          description: page.description ?? context.siteDescription,
          ...(page.image ? { image: page.image } : {}),
          noindex: page.noindex,
        },
        contentPage: page,
        blogPage: {
          kind: 'article',
          pathSegments: ['blog', ...segments],
        },
      }
    }
  }

  reply.status(404)
  return {
    context: {
      ...context,
      title: 'Blog post not found',
    },
    contentPage: null,
    blogPage: {
      kind: 'notFound',
      pathSegments: ['blog', ...segments],
    },
  }
}

/**
 * @param {{ data: BlogPageData }} ctx
 * @returns {HtmlRenderable}
 */
export default function blogPage ({ data }) {
  switch (data.blogPage.kind) {
    case 'index':
      return blogIndexPage(data)
    case 'year':
      return blogYearPage(data)
    case 'article':
      return blogArticlePage(data)
    case 'notFound':
    default:
      return blogNotFoundPage(data)
  }
}

/**
 * @param {Record<string, any>} options
 * @returns {Record<string, any>}
 */
export function routeOptions (options) {
  return {
    ...options,
    schema: contentRouteSchema(),
  }
}

/**
 * @param {BlogPageData} data
 * @returns {HtmlRenderable}
 */
function blogIndexPage (data) {
  return html/* html */`
    <div class="bc-content-page bc-blog-index-page">
      ${breadcrumb(data.blogPage.pathSegments)}
      <h1>Breadcrum.net Blog</h1>
      ${blogPostList(data.blogPage.posts ?? [])}
      <footer class="bc-blog-index-footer">
        <h2>Archive</h2>
        ${blogYearList(data.blogPage.years ?? [])}
      </footer>
    </div>
  `
}

/**
 * @param {BlogPageData} data
 * @returns {HtmlRenderable}
 */
function blogYearPage (data) {
  return html/* html */`
    <div class="bc-content-page bc-blog-index-page">
      ${breadcrumb(data.blogPage.pathSegments)}
      <h1>All ${data.blogPage.year ?? ''} Blog Posts</h1>
      ${blogPostList(data.blogPage.posts ?? [])}
    </div>
  `
}

/**
 * @param {BlogPageData} data
 * @returns {HtmlRenderable}
 */
function blogArticlePage (data) {
  if (!data.contentPage) return blogNotFoundPage(data)

  return html/* html */`
    <div class="bc-content-page bc-blog-article-page">
      ${breadcrumb(data.blogPage.pathSegments)}
      <article class="bc-article h-entry" itemscope itemtype="http://schema.org/NewsArticle">
        ${articleHeader({
          title: data.contentPage.title,
          authorImgUrl: data.contentPage.authorImgUrl,
          authorImgAlt: data.contentPage.authorImgAlt,
          authorName: data.contentPage.authorName,
          authorUrl: data.contentPage.authorUrl,
          publishDate: data.contentPage.publishDate,
          updatedDate: data.contentPage.updatedDate,
        })}
        ${markdownContent(data.contentPage)}
        <footer class="bc-blog-footer">
          <p>Want to follow along for future updates? Follow our <a href="/docs/social/">socials and feeds</a>.</p>
        </footer>
      </article>
      <giscus-widget
        id="comments"
        repo="hifiwi-fi/breadcrum.net"
        repoid="MDEwOlJlcG9zaXRvcnkzMjIwMjk3OTk="
        category="Announcements"
        categoryid="DIC_kwDOEzHI584CN95V"
        mapping="og:title"
        strict="0"
        reactionsenabled="1"
        emitmetadata="0"
        inputposition="top"
        theme="preferred_color_scheme"
        lang="en"
        loading="lazy"
      ></giscus-widget>
      ${breadcrumb(data.blogPage.pathSegments)}
    </div>
  `
}

/**
 * @param {BlogPageData} data
 * @returns {HtmlRenderable}
 */
function blogNotFoundPage (data) {
  return html/* html */`
    <div class="bc-content-page bc-blog-index-page">
      ${breadcrumb(data.blogPage.pathSegments)}
      <h1>Blog post not found</h1>
      <p>The requested blog post could not be found.</p>
    </div>
  `
}

/**
 * @param {BlogPostSummary[]} posts
 * @returns {HtmlRenderable}
 */
function blogPostList (posts) {
  return html/* html */`
    <ul class="bc-blog-index-list">
      ${posts.map(post => html/* html */`
        <li class="bc-blog-entry h-entry">
          <a class="bc-blog-entry-link u-url u-uid p-name" href="${post.routePath}">${post.title}</a>
          <time class="bc-blog-entry-date dt-published" datetime="${new Date(post.publishDate).toISOString()}">
            ${dateText(post.publishDate)}
          </time>
        </li>
      `)}
    </ul>
  `
}

/**
 * @param {string[]} years
 * @returns {HtmlRenderable}
 */
function blogYearList (years) {
  return html/* html */`
    <ul class="bc-blog-archive-list">
      ${years.map(year => html/* html */`
        <li><a href="/blog/${year}/">${year}</a></li>
      `)}
    </ul>
  `
}

/**
 * @returns {object}
 */
function contentRouteSchema () {
  return {
    tags: ['html'],
    response: {
      200: {
        type: 'string',
        contentMediaType: 'text/html',
      },
      301: {
        type: 'string',
      },
      404: {
        type: 'string',
        contentMediaType: 'text/html',
      },
    },
  }
}
