/** @import { AppOptions as RuntimeAppOptions } from '../../runtime/options.js' */
/** @typedef {RuntimeAppOptions} AppOptions */
import { createServerOptions } from '#resources/fastify-common/server-options.js'
import { dotEnvPath } from '../../runtime/config.js'

export const options = {
  ...createServerOptions({ serviceName: 'breadcrum-web' }),
  dotEnvPath,
  role: 'api',
}
