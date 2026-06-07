/**
 * @import { FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { FeedEditFormState } from '../view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { getFeedDetailsById, listFeeds, updateFeedDetails } from '../../api/feeds/feed-actions.js'
import { feedsPage } from '../view.js'

const feedsUpdateTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, { title: 'Update Feed' })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const form = feedUpdateForm(request.body)
  const errors = validateFeedUpdateForm(form)

  if (errors.length === 0) {
    const result = await updateFeedDetails(fastify, {
      userId: context.user.id,
      feedId: form.id,
      input: {
        title: form.title,
        description: form.description,
        image_url: form.imageUrl,
        explicit: form.explicit,
      },
    })

    if (result.ok) {
      return redirectForRequest(request, reply, `/feeds/?feed_id=${result.feed.id}`)
    }

    errors.push(formError(result.message))
    reply.status(result.statusCode)
  } else {
    reply.status(422)
  }

  const feed = form.id
    ? await getFeedDetailsById(fastify, {
      userId: context.user.id,
      feedId: form.id,
    })
    : null

  const body = await reply.render(feedsPage, {
    ...context,
    title: feed?.title ?? 'Feeds',
    feedsPage: {
      feeds: await listFeeds(fastify, { userId: context.user.id }),
      feed,
      edit: true,
      editForm: {
        ...form,
        errors,
      },
      error: feed ? null : 'Feed not found.',
    },
  }, renderOptions(request))

  return reply.send(body)
}

/**
 * @param {unknown} body
 * @returns {FeedEditFormState}
 */
function feedUpdateForm (body) {
  const fields = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {}

  return {
    id: stringField(fields['id']),
    title: stringField(fields['title']),
    description: stringField(fields['description']),
    imageUrl: stringField(fields['imageUrl']),
    explicit: checkboxField(fields['explicit']),
    errors: [],
  }
}

/**
 * @param {FeedEditFormState} form
 * @returns {FormError[]}
 */
function validateFeedUpdateForm (form) {
  /** @type {FormError[]} */
  const errors = []

  if (!form.id) errors.push(formError('Feed id is required.', 'id'))
  if (!form.title) errors.push(formError('Title is required.', 'title'))
  if (form.title.length > 255) errors.push(formError('Title must be 255 characters or fewer.', 'title'))
  if (form.description.length > 30000) errors.push(formError('Description must be 30000 characters or fewer.', 'description'))
  if (form.imageUrl && !URL.canParse(form.imageUrl)) errors.push(formError('Enter a valid image URL.', 'imageUrl'))

  return errors
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, feedsUpdateTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/feeds/'))
  return `/login/?redirect=${redirect}`
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function checkboxField (value) {
  return value === true || value === 'true' || value === 'on'
}
