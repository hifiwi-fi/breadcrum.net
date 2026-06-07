import { buildDomstackFastify } from '@domstack/fastify/build.js'
import path from 'node:path'

const webRoot = path.resolve(import.meta.dirname, '..')

await buildDomstackFastify({
  src: path.join(webRoot, 'routes'),
  dest: path.join(webRoot, 'public'),
  ignore: [
    'api',
    '**/*.test.js',
    '**/*.schema.js',
  ],
})
