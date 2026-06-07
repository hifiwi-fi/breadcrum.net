/**
 * @import { FastifyRequest } from 'fastify'
 * @import { TypeArchiveRead } from '../../api/archives/schemas/schema-archive-read.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { render } from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { getArchive } from '../../api/archives/archive-query-get.js'
import { archiveArticle, archiveEditFormFromArchive } from '../archive.view.js'
import { archiveViewPage } from './view.js'

const archiveViewTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Archive',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const url = new URL(request.url, 'https://breadcrum.invalid')
  const id = url.searchParams.get('id')
  if (!id) {
    return redirectForRequest(request, reply, '/archives/')
  }

  const edit = url.searchParams.get('edit') === 'true'
  const archive = await getArchiveForView(fastify, {
    userId: context.user.id,
    archiveId: id,
    sensitive: edit || url.searchParams.get('sensitive') === 'true',
  })

  if (!archive) {
    reply.status(404)
  }

  if (archive && isHtmxRequest(request) && url.searchParams.get('fragment') === 'archive') {
    const redirectPath = safeRedirectPath(
      url.searchParams.get('redirect'),
          `/archives/view/?id=${archive.id}`
    )
    const body = await render(archiveArticle(archive, {
      fullView: true,
      redirectPath,
      deleteRedirectPath: `/bookmarks/view/?id=${archive.bookmark.id}`,
    }))
    return reply.send(body)
  }

  const body = await reply.render(archiveViewPage, {
    ...context,
    title: archive?.display_title ?? archive?.title ?? 'Archive',
    archiveViewPage: {
      archive: archive ?? null,
      error: archive ? null : 'Archive not found.',
      edit,
      editForm: archive ? archiveEditFormFromArchive(archive) : null,
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
    ? fragmentIdFromTarget(request, archiveViewTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.archiveId
 * @param {boolean} params.sensitive
 * @returns {Promise<TypeArchiveRead | undefined>}
 */
async function getArchiveForView (fastify, { userId, archiveId, sensitive }) {
  return getArchive({
    fastify,
    ownerId: userId,
    archiveId,
    sensitive,
    perPage: 1,
    fullArchives: true,
  })
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/archives/view/'))
  return `/login/?redirect=${redirect}`
}
