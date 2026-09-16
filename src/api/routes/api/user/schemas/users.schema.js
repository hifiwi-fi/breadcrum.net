import fp from 'fastify-plugin'

// import { schemaUserCreate } from './schema-user-create.js'
import { schemaUserRead } from './schema-user-read.js'
import { schemaUserUpdate } from './schema-user-update.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  // fastify.addSchema(schemaUserCreate)
  fastify.addSchema(schemaUserRead)
  fastify.addSchema(schemaUserUpdate)
}, {
  name: 'users.schema',
  dependencies: [],
})
