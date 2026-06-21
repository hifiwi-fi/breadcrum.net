/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */
import fp from 'fastify-plugin'
import { stripIndent } from 'common-tags'
import fsp from 'node:fs/promises'
import path from 'node:path'

export const swaggerEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    SWAGGER: { type: 'boolean', default: true },
  },
  required: [],
})

/**
 * This plugins adds fastify-swagger
 *
 * @see https://github.com/fastify/fastify-swagger
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Breadcrum API',
        description: stripIndent`
        Breadcrum\'s (unstable) API.

        Implementing against this API is not recomended unless you are eager track breaking changes.
        You have been warned!
        `,
        version: '0.0.0',
      },
    },
  })

  if (fastify.config.SWAGGER) {
    fastify.register(import('@fastify/swagger-ui'), {
      routePrefix: '/openapi',
      logo: {
        type: 'image/png',
        content: await fsp.readFile(path.join(import.meta.dirname, '../client/static/bread.png')),
      },
    })
  }
}, {
  name: 'swagger',
  dependencies: ['env'],
})
