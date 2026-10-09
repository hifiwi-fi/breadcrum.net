/** @import { FastifyReply, FastifyRequest } from 'fastify' */
import { LogController } from 'fastify'

/**
 * Keep a single useful automatic access record per successful request.
 * Fastify's dedicated error log methods remain unchanged.
 */
export class RequestLogController extends LogController {
  /**
   * @override
   * @param {FastifyRequest} _request
   * @param {FastifyReply} _reply
   */
  incomingRequest (_request, _reply) {}

  /**
   * @override
   * @param {Error | null | undefined} error
   * @param {FastifyRequest} request
   * @param {FastifyReply} reply
   */
  requestCompleted (error, request, reply) {
    if (error) {
      super.requestCompleted(error, request, reply)
      return
    }

    if (this.isLogDisabled(request)) return

    request.log.info({
      req: request,
      res: reply,
      route: request.routeOptions.url,
      responseTime: reply.elapsedTime,
    }, 'request completed')
  }
}
