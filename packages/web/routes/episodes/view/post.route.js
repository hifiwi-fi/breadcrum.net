/**
 * @import { FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { TypeEpisodeRead } from '../../api/episodes/schemas/schema-episode-read.js'
 * @import { TypeEpisodeUpdate } from '../../api/episodes/schemas/schema-episode-update.js'
 * @import { EpisodeEditFormState } from '../episode.view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { render } from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { getEpisode } from '../../api/episodes/episode-query-get.js'
import { getFeedWithDefaults } from '../../api/feeds/feed-defaults.js'
import { hydrateEmbed } from '../../api/episodes/hydrate-embed.js'
import { updateEpisode } from '../../api/episodes/episode-actions.js'
import { episodeArticle, episodeEditForm } from '../episode.view.js'
import { episodeViewPage } from './view.js'

const episodeViewTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Episode',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const form = episodeEditFormFromBody(request.body)
  const errors = validateEpisodeEditForm(form)

  if (errors.length === 0) {
    await updateEpisode(fastify, {
      userId: context.user.id,
      episodeId: form.id,
      episode: episodeUpdateInput(form),
    })

    const episode = await getEpisodeForView(fastify, {
      userId: context.user.id,
      episodeId: form.id,
      sensitive: true,
    })

    if (episode) {
      if (isHtmxRequest(request)) {
        const body = await render(episodeArticle(episode, {
          fullView: true,
          showError: true,
          redirectPath: `/episodes/view/?id=${episode.id}`,
          deleteRedirectPath: `/bookmarks/view/?id=${episode.bookmark.id}`,
        }))
        return reply.send(body)
      }

      return redirectForRequest(request, reply, `/episodes/view/?id=${episode.id}`)
    }

    errors.push(formError('Episode not found.'))
    reply.status(404)
  } else {
    reply.status(422)
  }

  const editForm = {
    ...form,
    errors,
  }

  if (isHtmxRequest(request)) {
    const body = await render(episodeEditForm(editForm))
    return reply.send(body)
  }

  const episode = form.id
    ? await getEpisodeForView(fastify, {
      userId: context.user.id,
      episodeId: form.id,
      sensitive: true,
    }) ?? null
    : null

  const body = await reply.render(episodeViewPage, {
    ...context,
    title: episode?.display_title ?? episode?.title ?? 'Episode',
    episodeViewPage: {
      episode,
      error: episode ? null : 'Episode not found.',
      edit: true,
      editForm,
    },
  }, renderOptions(request))

  return reply.send(body)
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, episodeViewTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.episodeId
 * @param {boolean} params.sensitive
 * @returns {Promise<TypeEpisodeRead | undefined>}
 */
async function getEpisodeForView (fastify, { userId, episodeId, sensitive }) {
  const episode = await getEpisode({
    fastify,
    ownerId: userId,
    episodeId,
    sensitive,
    perPage: 1,
    includeFeed: true,
  })

  if (!episode) return undefined

  episode.podcast_feed = getFeedWithDefaults({
    feed: episode.podcast_feed,
    transport: fastify.config.TRANSPORT,
    host: fastify.config.HOST,
  })

  hydrateEmbed(episode)

  return episode
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/episodes/view/'))
  return `/login/?redirect=${redirect}`
}

/**
 * @param {unknown} body
 * @returns {EpisodeEditFormState}
 */
function episodeEditFormFromBody (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    id: stringField(fields['id']),
    url: stringField(fields['url']).trim(),
    title: stringField(fields['title']).trim(),
    explicit: checkboxField(fields['explicit']),
    redirect: safeRedirectPath(stringField(fields['redirect']), '/episodes/'),
    errors: [],
  }
}

/**
 * @param {EpisodeEditFormState} form
 * @returns {FormError[]}
 */
function validateEpisodeEditForm (form) {
  /** @type {FormError[]} */
  const errors = []

  if (!form.id) errors.push(formError('Episode id is required.', 'id'))
  if (!form.title) errors.push(formError('Title is required.', 'title'))
  if (form.title.length > 255) errors.push(formError('Title must be 255 characters or fewer.', 'title'))

  return errors
}

/**
 * @param {EpisodeEditFormState} form
 * @returns {TypeEpisodeUpdate}
 */
function episodeUpdateInput (form) {
  return {
    title: form.title,
    explicit: form.explicit,
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  if (Array.isArray(value)) return String(value.at(-1) ?? '')
  if (value == null) return ''
  return String(value)
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function checkboxField (value) {
  if (Array.isArray(value)) return value.some(item => checkboxField(item))
  return value === 'true' || value === 'on' || value === '1'
}
