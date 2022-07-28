import fp from 'fastify-plugin'
import PQueue from 'p-queue'

export default fp(async function (fastify, opts) {
  const queue = new PQueue({
    concurrency: 10,
    timeout: 60000
  })

  let count = 0

  queue.on('active', () => {
    fastify.log.info(`Working on item #${++count}.  Size: ${queue.size}  Pending: ${queue.pending}`)
  })

  queue.on('error', error => {
    fastify.log.error(error)
  })

  queue.on('idle', () => {
    fastify.log.info(`Queue is idle.  Size: ${queue.size}  Pending: ${queue.pending}`)
  })

  queue.on('add', () => {
    fastify.log.info(`Task is added.  Size: ${queue.size}  Pending: ${queue.pending}`)
  })

  queue.on('next', () => {
    fastify.log.info(`Task is completed.  Size: ${queue.size}  Pending: ${queue.pending}`)
  })

  fastify.decorate('pqueue', queue)
},
{
  name: 'queue',
  dependencies: ['env']
})
