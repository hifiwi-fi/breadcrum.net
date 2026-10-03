/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const otelMetricsEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    OTEL_SERVICE_NAME: { type: 'string', default: 'breadcrum-web' },
    OTEL_SERVICE_VERSION: { type: 'string', default: '1.0.0' },
    OTEL_RESOURCE_ATTRIBUTES: { type: 'string', default: 'deployment.environment=development' },
  },
  required: [],
})
