/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

export const passkeyProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: [],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'The unique identifier of the passkey',
    },
    credential_id: {
      type: 'string',
      description: 'The WebAuthn credential ID',
    },
    name: {
      type: 'string',
      maxLength: 100,
      description: 'User-defined friendly name for the passkey',
    },
    created_at: {
      type: 'string',
      format: 'date-time',
      description: 'When the passkey was registered',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description: 'When the passkey was last updated',
    },
    last_used: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description: 'When the passkey was last used for authentication',
    },
    transports: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['internal', 'usb', 'nfc', 'ble', 'hybrid'],
      },
      nullable: true,
      description: 'Array of supported authenticator transport methods',
    },
    aaguid: {
      type: 'string',
      nullable: true,
      description: 'Authenticator Attestation GUID identifying the authenticator model',
    },
  }
})
