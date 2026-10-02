import { randomUUID } from 'node:crypto'
import SQL from '@nearform/sql'

/**
 * Creates a test passkey directly in the database
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId - User ID to create passkey for
 * @param {object} [options] - Optional passkey properties
 * @param {string} [options.name] - Passkey name
 * @param {string} [options.credentialId] - Credential ID (auto-generated if not provided)
 * @param {string} [options.publicKey] - Public key (mock if not provided)
 * @param {string} [options.algorithm] - Algorithm (default: "ES256")
 * @param {number} [options.counter] - Counter value (default: 0)
 * @param {string[] | null} [options.transports] - Transport methods
 * @param {string | null} [options.aaguid] - Authenticator GUID
 * @returns {Promise<{
 *   id: string,
 *   userId: string,
 *   credentialId: string,
 *   name: string,
 *   createdAt: Date,
 *   counter: number
 * }>}
 */
export async function createTestPasskey (app, userId, options = {}) {
  const id = randomUUID()
  const credentialId = options.credentialId || `test_cred_${randomUUID().slice(0, 16)}`
  const name = options.name || `Test Passkey ${Date.now()}`
  const publicKey = options.publicKey || 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE_mock_public_key_for_testing'
  const algorithm = options.algorithm || 'ES256'
  const counter = options.counter ?? 0
  const transports = options.transports !== undefined ? options.transports : ['internal']
  const aaguid = options.aaguid !== undefined ? options.aaguid : '00000000-0000-0000-0000-000000000000'

  const query = SQL`
    insert into passkeys (
      id,
      user_id,
      credential_id,
      public_key,
      algorithm,
      counter,
      transports,
      aaguid,
      name,
      created_at
    )
    values (
      ${id},
      ${userId},
      ${credentialId},
      ${publicKey},
      ${algorithm},
      ${counter},
      ${transports ? SQL`${transports}::authenticator_transport[]` : SQL`null`},
      ${aaguid},
      ${name},
      now()
    )
    returning id, user_id, credential_id, name, created_at, counter
  `

  const result = await app.pg.query(query)
  const row = result.rows[0]

  return {
    id: row.id,
    userId: row.user_id,
    credentialId: row.credential_id,
    name: row.name,
    createdAt: row.created_at,
    counter: row.counter
  }
}

/**
 * Gets the count of passkeys for a user
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of passkeys
 */
export async function getPasskeyCount (app, userId) {
  const query = SQL`
    select count(*) as count
    from passkeys
    where user_id = ${userId}
  `

  const result = await app.pg.query(query)
  return parseInt(result.rows[0].count, 10)
}

/**
 * Deletes all passkeys for a user (cleanup helper)
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of passkeys deleted
 */
export async function deleteAllPasskeys (app, userId) {
  const query = SQL`
    delete from passkeys
    where user_id = ${userId}
  `

  const result = await app.pg.query(query)
  return result.rowCount ?? 0
}

/**
 * Asserts that a passkey object has the expected shape
 * @param {import('node:assert')} assert
 * @param {any} passkey
 */
export function assertPasskeyShape (assert, passkey) {
  assert.ok(passkey.id, 'Passkey should have id')
  assert.ok(passkey.credential_id, 'Passkey should have credential_id')
  assert.ok(passkey.name, 'Passkey should have name')
  assert.ok(passkey.created_at, 'Passkey should have created_at')

  // These fields can be null
  assert.ok('updated_at' in passkey, 'Passkey should have updated_at field')
  assert.ok('last_used' in passkey, 'Passkey should have last_used field')
  assert.ok('transports' in passkey, 'Passkey should have transports field')
  assert.ok('aaguid' in passkey, 'Passkey should have aaguid field')

  // Should NOT include sensitive data
  assert.ok(!('public_key' in passkey), 'Passkey should not expose public_key')
  assert.ok(!('counter' in passkey), 'Passkey should not expose counter')
  assert.ok(!('user_id' in passkey), 'Passkey should not expose user_id')
}

/**
 * Mock registration payload structure (for reference/documentation)
 * Note: Actual WebAuthn payloads are complex and browser-generated
 * These mocks are for structural reference only
 */
export const mockRegistrationPayloadStructure = {
  challenge: 'mock_challenge_string',
  id: 'mock_credential_id',
  rawId: 'mock_raw_id',
  type: 'public-key',
  response: {
    attestationObject: 'mock_attestation',
    authenticatorData: 'mock_auth_data',
    clientDataJSON: 'mock_client_data',
    publicKey: 'mock_public_key',
    publicKeyAlgorithm: -7,
    transports: ['internal']
  },
  user: {
    name: 'test@example.com',
    id: 'user-uuid'
  }
}

/**
 * Mock authentication payload structure (for reference/documentation)
 * Note: Actual WebAuthn payloads are complex and browser-generated
 * These mocks are for structural reference only
 */
export const mockAuthenticationPayloadStructure = {
  challenge: 'mock_challenge_string',
  id: 'mock_credential_id',
  rawId: 'mock_raw_id',
  type: 'public-key',
  authenticatorAttachment: 'platform',
  response: {
    authenticatorData: 'mock_auth_data',
    clientDataJSON: 'mock_client_data',
    signature: 'mock_signature',
    userHandle: 'mock_user_handle'
  }
}
