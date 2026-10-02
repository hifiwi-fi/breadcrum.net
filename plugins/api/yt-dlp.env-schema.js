/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const ytDlpEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    YT_DLP_API_URL: { type: 'string', default: 'http://user:pass@127.0.0.1:3010' },
  },
  required: [],
})
