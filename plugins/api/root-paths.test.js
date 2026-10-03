import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import auth from '@fastify/auth'
import { loadConfig } from '#config/config.js'
import pkg from './pkg.js'
import staticPlugin from './static.js'
import swagger from './swagger.js'

const rootUrl = new URL('../../', import.meta.url)

test('package metadata is loaded from the repository root', async t => {
  const app = Fastify()
  t.after(() => app.close())
  await app.register(pkg)
  const expected = JSON.parse(await fs.readFile(new URL('package.json', rootUrl), 'utf8'))
  assert.deepEqual(app.pkg, expected)
})

test('static registration resolves public and admin assets under the repository root', async t => {
  const app = Fastify()
  t.after(() => app.close())
  app.decorate('config', loadConfig('worker', { dotEnvPath: false, processEnv: {} }))
  app.decorate('verifyJWT', async () => {})
  app.decorate('verifyAdmin', async () => {})
  for (const name of ['compress', 'jwt', 'helmet']) {
    app.register(fp(async () => {}, { name }))
  }
  app.register(fp(async instance => { instance.register(auth) }, { name: 'auth' }))
  const registrations = t.mock.method(app, 'register')
  app.register(staticPlugin)
  await app.ready()
  const roots = registrations.mock.calls
    .map(call => {
      const options = call.arguments[1]
      return options && typeof options === 'object' && 'root' in options ? options['root'] : undefined
    })
    .filter(root => typeof root === 'string')
  assert.deepEqual(roots, [
    fileURLToPath(new URL('public', rootUrl)),
    fileURLToPath(new URL('public/admin', rootUrl)),
  ])
})

test('Swagger reads its logo from the repository public assets', async t => {
  const app = Fastify()
  t.after(() => app.close())
  app.register(fp(async instance => {
    instance.decorate('config', loadConfig('worker', {
      dotEnvPath: false,
      processEnv: {},
      envData: { SWAGGER: true },
    }))
  }, { name: 'env' }))
  const logo = Buffer.from('test-logo')
  const readFile = t.mock.method(fs, 'readFile', async (/** @type {unknown} */ path) => {
    assert.equal(path, fileURLToPath(new URL('public/static/bread.png', rootUrl)))
    return logo
  })
  app.register(swagger)
  await app.ready()
  assert.equal(readFile.mock.callCount(), 1)
  const response = await app.inject('/openapi/static/swagger-initializer.js')
  assert.equal(response.statusCode, 200)
  assert.ok(response.body.includes(`data:image/png;base64,${logo.toString('base64')}`))
})
