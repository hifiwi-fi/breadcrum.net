import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { createTestUser } from '../../auth-tokens/auth-tokens-test-utils.js'
import { createTestPasskey, assertPasskeyShape } from '../passkeys-test-utils.js'

await suite('PATCH /api/user/passkeys/:id', async () => {
  await test('update passkey - success cases', async (t) => {
    const app = await build(t)

    await t.test('successfully updates passkey name', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Original Name' })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'Updated Name'
        }
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 OK')

      const body = JSON.parse(res.payload)
      assert.strictEqual(body.id, passkey.id, 'Should return same passkey ID')
      assert.strictEqual(body.name, 'Updated Name', 'Name should be updated')
      assertPasskeyShape(assert, body)
    })

    await t.test('sets updated_at timestamp when name is changed', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Original Name' })

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'New Name'
        }
      })

      assert.strictEqual(res.statusCode, 200)

      const body = JSON.parse(res.payload)
      assert.ok(body.updated_at, 'updated_at should be set')
      assert.notStrictEqual(body.updated_at, null, 'updated_at should not be null after update')
    })

    await t.test('returns all passkey fields after update', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const testTransports = ['internal', 'usb']
      const testAaguid = 'test-aaguid-12345'

      const passkey = await createTestPasskey(app, user.userId, {
        name: 'Original',
        transports: testTransports,
        aaguid: testAaguid
      })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'Updated'
        }
      })

      assert.strictEqual(res.statusCode, 200)

      const body = JSON.parse(res.payload)
      assert.strictEqual(body.name, 'Updated', 'Name should be updated')
      assert.ok(body.credential_id, 'Should have credential_id')
      assert.ok(body.created_at, 'Should have created_at')
      assert.deepStrictEqual(body.transports, testTransports, 'Transports should be unchanged')
      assert.strictEqual(body.aaguid, testAaguid, 'AAGUID should be unchanged')
    })

    await t.test('allows updating to same name', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Same Name' })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'Same Name'
        }
      })

      assert.strictEqual(res.statusCode, 200, 'Should allow updating to same name')

      const body = JSON.parse(res.payload)
      assert.strictEqual(body.name, 'Same Name')
    })

    await t.test('accepts name at minimum length (1 character)', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Original' })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'A'
        }
      })

      assert.strictEqual(res.statusCode, 200, 'Should accept 1 character name')

      const body = JSON.parse(res.payload)
      assert.strictEqual(body.name, 'A')
    })

    await t.test('accepts name at maximum length (100 characters)', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Original' })

      const longName = 'a'.repeat(100)

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: longName
        }
      })

      assert.strictEqual(res.statusCode, 200, 'Should accept 100 character name')

      const body = JSON.parse(res.payload)
      assert.strictEqual(body.name, longName)
      assert.strictEqual(body.name.length, 100)
    })

    await t.test('allows multiple updates to same passkey', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Version 1' })

      // First update
      const res1 = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'Version 2'
        }
      })

      assert.strictEqual(res1.statusCode, 200)
      const body1 = JSON.parse(res1.payload)
      assert.strictEqual(body1.name, 'Version 2')

      // Second update
      const res2 = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'Version 3'
        }
      })

      assert.strictEqual(res2.statusCode, 200)
      const body2 = JSON.parse(res2.payload)
      assert.strictEqual(body2.name, 'Version 3')
    })
  })

  await test('update passkey - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when not authenticated', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test' })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        payload: {
          name: 'Updated'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })

    await t.test('returns 401 with invalid token', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test' })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: 'Bearer invalid-token'
        },
        payload: {
          name: 'Updated'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })

    await t.test('returns 404 when passkey does not exist', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${nonExistentId}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'Updated'
        }
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 Not Found')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('not found'), 'Error should mention not found')
    })

    await t.test('returns 404 when passkey belongs to different user', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Create passkey for user1
      const passkey = await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey' })

      // Try to update with user2's token
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user2.token}`
        },
        payload: {
          name: 'Hacked Name'
        }
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 Not Found')

      // Verify passkey name was not changed
      const checkRes = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })
      const checkBody = JSON.parse(checkRes.payload)
      assert.strictEqual(checkBody.name, 'User 1 Passkey', 'Name should not be changed')
    })

    await t.test('returns 400 when missing name field', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test' })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {}
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('returns 400 when name is empty string', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test' })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: ''
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('returns 400 when name exceeds 100 characters', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test' })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'a'.repeat(101)
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('returns 400 with invalid UUID format', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/user/passkeys/not-a-valid-uuid',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'Updated'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })
  })

  await test('update passkey - isolation cases', async (t) => {
    const app = await build(t)

    await t.test('user can only update their own passkeys', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Create passkeys for both users
      const passkey1 = await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey' })
      const passkey2 = await createTestPasskey(app, user2.userId, { name: 'User 2 Passkey' })

      // User1 can update their own passkey
      const res1 = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey1.id}`,
        headers: {
          authorization: `Bearer ${user1.token}`
        },
        payload: {
          name: 'User 1 Updated'
        }
      })
      assert.strictEqual(res1.statusCode, 200, 'User 1 should update their own passkey')
      const body1 = JSON.parse(res1.payload)
      assert.strictEqual(body1.name, 'User 1 Updated')

      // User1 cannot update user2's passkey
      const res2 = await app.inject({
        method: 'PATCH',
        url: `/api/user/passkeys/${passkey2.id}`,
        headers: {
          authorization: `Bearer ${user1.token}`
        },
        payload: {
          name: 'Hacked'
        }
      })
      assert.strictEqual(res2.statusCode, 404, 'User 1 should not update user 2 passkey')

      // Verify user2's passkey was not changed
      const checkRes = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey2.id}`,
        headers: {
          authorization: `Bearer ${user2.token}`
        }
      })
      const checkBody = JSON.parse(checkRes.payload)
      assert.strictEqual(checkBody.name, 'User 2 Passkey', 'User 2 passkey should be unchanged')
    })
  })
})
