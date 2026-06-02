/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { TypeArchiveRead } from '../../api/archives/schemas/schema-archive-read.js'
 * @import { TypeArchiveUpdate } from '../../api/archives/schemas/schema-archive-update.js'
 * @import { ArchiveEditFormState } from '../archive.view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { render } from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { getArchive } from '../../api/archives/archive-query-get.js'
import { updateArchive } from '../../api/archives/archive-actions.js'
import { archiveArticle, archiveEditForm, archiveEditFormFromArchive } from '../archive.view.js'
import { archiveViewPage } from './view.js'

const archiveViewTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function archiveViewRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        404: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function getArchiveViewHandler (request, reply) {
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
  })

  fastify.post('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        400: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        404: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        422: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function postArchiveViewHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Archive',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const form = archiveEditFormFromBody(request.body)
    const errors = validateArchiveEditForm(form)

    if (errors.length === 0) {
      await updateArchive(fastify, {
        userId: context.user.id,
        archiveId: form.id,
        archive: archiveUpdateInput(form),
      })

      const archive = await getArchiveForView(fastify, {
        userId: context.user.id,
        archiveId: form.id,
        sensitive: true,
      })

      if (archive) {
        if (isHtmxRequest(request)) {
          const body = await render(archiveArticle(archive, {
            fullView: true,
            redirectPath: `/archives/view/?id=${archive.id}`,
            deleteRedirectPath: `/bookmarks/view/?id=${archive.bookmark.id}`,
          }))
          return reply.send(body)
        }

        return redirectForRequest(request, reply, `/archives/view/?id=${archive.id}`)
      }

      errors.push(formError('Archive not found.'))
      reply.status(404)
    } else {
      reply.status(422)
    }

    const editForm = {
      ...form,
      errors,
    }

    if (isHtmxRequest(request)) {
      const body = await render(archiveEditForm(editForm))
      return reply.send(body)
    }

    const archive = form.id
      ? await getArchiveForView(fastify, {
          userId: context.user.id,
          archiveId: form.id,
          sensitive: true,
        }) ?? null
      : null

    const body = await reply.render(archiveViewPage, {
      ...context,
      title: archive?.display_title ?? archive?.title ?? 'Archive',
      archiveViewPage: {
        archive,
        error: archive ? null : 'Archive not found.',
        edit: true,
        editForm,
      },
    }, renderOptions(request))

    return reply.send(body)
  })
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

/**
 * @param {unknown} body
 * @returns {ArchiveEditFormState}
 */
function archiveEditFormFromBody (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    id: stringField(fields['id']),
    url: stringField(fields['url']).trim(),
    title: stringField(fields['title']).trim(),
    redirect: safeRedirectPath(stringField(fields['redirect']), '/archives/'),
    errors: [],
  }
}

/**
 * @param {ArchiveEditFormState} form
 * @returns {FormError[]}
 */
function validateArchiveEditForm (form) {
  /** @type {FormError[]} */
  const errors = []

  if (!form.id) errors.push(formError('Archive id is required.', 'id'))
  if (!form.title) errors.push(formError('Title is required.', 'title'))
  if (form.title.length > 255) errors.push(formError('Title must be 255 characters or fewer.', 'title'))

  return errors
}

/**
 * @param {ArchiveEditFormState} form
 * @returns {TypeArchiveUpdate}
 */
function archiveUpdateInput (form) {
  return {
    title: form.title,
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
