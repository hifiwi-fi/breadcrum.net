import fp from 'fastify-plugin'
import PQueue from 'p-queue'

export default fp(async function (fastify, opts) {
  const queue = new PQueue({
    concurrency: fastify.config.PQUEUE_CONCURRENCY,
    timeout: fastify.config.PQUEUE_TIMEOUT
  })

  let count = 0
  const qCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_pqueue_total',
    help: 'The number of times the queue has been added to'
  })
  const qErrorCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_pqueue_error_total',
    help: 'The number of times the queue has an error'
  })
  const qGauge = new fastify.metrics.client.Gauge({
    name: 'breadcrum_pqueue_size',
    help: 'The number of items waiting in the queue to run'
  })
  const pendingQGauge = new fastify.metrics.client.Gauge({
    name: 'breadcrum_pqueue_pending',
    help: 'The number of items currently running from the queue'
  })

  queue.on('active', () => {
    qCounter.inc()
    fastify.log.info(`Working on item #${++count}.  Size: ${queue.size}  Pending: ${queue.pending}`)
  })

  queue.on('error', error => {
    qErrorCounter.inc()
    fastify.log.error(error)
  })

  queue.on('idle', () => {
    qGauge.set(queue.size)
    pendingQGauge.set(queue.pending)
    fastify.log.info(`Queue is idle.  Size: ${queue.size}  Pending: ${queue.pending}`)
  })

  queue.on('add', () => {
    qGauge.set(queue.size)
    pendingQGauge.set(queue.pending)
    fastify.log.info(`Task is added.  Size: ${queue.size}  Pending: ${queue.pending}`)
  })

  queue.on('next', () => {
    qGauge.set(queue.size)
    pendingQGauge.set(queue.pending)
    fastify.log.info(`Task is completed.  Size: ${queue.size}  Pending: ${queue.pending}`)
  })

  fastify.decorate('pqueue', queue)

  fastify.addHook('onClose', async (instance) => {
    // Wait for the queue to be empty before shutting down
    await queue.onEmpty()
  })
},
{
  name: 'pqueue',
  dependencies: ['env', 'prom']
})
