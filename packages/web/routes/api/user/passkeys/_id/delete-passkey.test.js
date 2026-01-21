import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { createTestUser } from '../../auth-tokens/auth-tokens-test-utils.js'
import { createTestPasskey, getPasskeyCount } from '../passkeys-test-utils.js'

await suite('DELETE /api/user/passkeys/:id', async () => {
  await test('delete passkey - success cases', async (t) => {
    const app = await build(t)

    await t.test('successfully deletes a passkey', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test Passkey' })

      // Verify passkey exists
      const initialCount = await getPasskeyCount(app, user.userId)
      assert.strictEqual(initialCount, 1, 'Should have 1 passkey initially')

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 204, 'Should return 204 No Content')
      assert.strictEqual(res.payload, '', 'Response body should be empty')

      // Verify passkey was deleted
      const finalCount = await getPasskeyCount(app, user.userId)
      assert.strictEqual(finalCount, 0, 'Should have 0 passkeys after deletion')
    })

    await t.test('passkey is actually removed from database', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'To Be Deleted' })

      // Delete passkey
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(deleteRes.statusCode, 204)

      // Try to get deleted passkey
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(getRes.statusCode, 404, 'Deleted passkey should not be found')
    })

    await t.test('can delete multiple passkeys one by one', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create 3 passkeys
      const passkey1 = await createTestPasskey(app, user.userId, { name: 'Passkey 1' })
      const passkey2 = await createTestPasskey(app, user.userId, { name: 'Passkey 2' })
      const passkey3 = await createTestPasskey(app, user.userId, { name: 'Passkey 3' })

      assert.strictEqual(await getPasskeyCount(app, user.userId), 3, 'Should have 3 passkeys')

      // Delete first passkey
      const res1 = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey1.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })
      assert.strictEqual(res1.statusCode, 204)
      assert.strictEqual(await getPasskeyCount(app, user.userId), 2, 'Should have 2 passkeys')

      // Delete second passkey
      const res2 = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey2.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })
      assert.strictEqual(res2.statusCode, 204)
      assert.strictEqual(await getPasskeyCount(app, user.userId), 1, 'Should have 1 passkey')

      // Delete third passkey
      const res3 = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey3.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })
      assert.strictEqual(res3.statusCode, 204)
      assert.strictEqual(await getPasskeyCount(app, user.userId), 0, 'Should have 0 passkeys')
    })

    await t.test('can delete last remaining passkey', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Last One' })

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 204, 'Should allow deleting last passkey')
      assert.strictEqual(await getPasskeyCount(app, user.userId), 0, 'User should have no passkeys')
    })

    await t.test('deleting passkey does not affect list endpoint', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create 3 passkeys
      const passkey1 = await createTestPasskey(app, user.userId, { name: 'Keep 1' })
      const passkey2 = await createTestPasskey(app, user.userId, { name: 'Delete Me' })
      const passkey3 = await createTestPasskey(app, user.userId, { name: 'Keep 2' })

      // Delete middle passkey
      await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey2.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      // List remaining passkeys
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(listRes.statusCode, 200)
      const body = JSON.parse(listRes.payload)
      assert.strictEqual(body.length, 2, 'Should have 2 passkeys')

      const ids = body.map((/** @type {any} */ p) => p.id)
      assert.ok(ids.includes(passkey1.id), 'Should still have passkey 1')
      assert.ok(!ids.includes(passkey2.id), 'Should not have passkey 2')
      assert.ok(ids.includes(passkey3.id), 'Should still have passkey 3')
    })

    await t.test('can delete and re-register up to 10 passkeys', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create 10 passkeys
      const passkeys = []
      for (let i = 1; i <= 10; i++) {
        const passkey = await createTestPasskey(app, user.userId, { name: `Passkey ${i}` })
        passkeys.push(passkey)
      }

      assert.strictEqual(await getPasskeyCount(app, user.userId), 10, 'Should have 10 passkeys')

      // Delete 5 passkeys
      for (let i = 0; i < 5; i++) {
        /** @type {any} */
        const res = await app.inject({
          method: 'DELETE',
          url: `/api/user/passkeys/${passkeys[i]?.id}`,
          headers: {
            authorization: `Bearer ${user.token}`
          }
        })
        assert.strictEqual(res.statusCode, 204)
      }

      assert.strictEqual(await getPasskeyCount(app, user.userId), 5, 'Should have 5 passkeys')

      // Add 5 more passkeys
      for (let i = 11; i <= 15; i++) {
        await createTestPasskey(app, user.userId, { name: `Passkey ${i}` })
      }

      assert.strictEqual(await getPasskeyCount(app, user.userId), 10, 'Should be back to 10 passkeys')
    })
  })

  await test('delete passkey - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when not authenticated', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test' })

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey.id}`
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')

      // Verify passkey was not deleted
      assert.strictEqual(await getPasskeyCount(app, user.userId), 1, 'Passkey should still exist')
    })

    await t.test('returns 401 with invalid token', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test' })

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')

      // Verify passkey was not deleted
      assert.strictEqual(await getPasskeyCount(app, user.userId), 1, 'Passkey should still exist')
    })

    await t.test('returns 404 when passkey does not exist', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${nonExistentId}`,
        headers: {
          authorization: `Bearer ${user.token}`
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

      // Try to delete with user2's token
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user2.token}`
        }
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 Not Found')

      // Verify passkey still exists for user1
      assert.strictEqual(await getPasskeyCount(app, user1.userId), 1, 'Passkey should still exist')

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })
      assert.strictEqual(getRes.statusCode, 200, 'User 1 should still be able to access passkey')
    })

    await t.test('returns 400 with invalid UUID format', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/user/passkeys/not-a-valid-uuid',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('cannot delete same passkey twice', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test' })

      // First deletion should succeed
      const res1 = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })
      assert.strictEqual(res1.statusCode, 204, 'First deletion should succeed')

      // Second deletion should fail
      const res2 = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })
      assert.strictEqual(res2.statusCode, 404, 'Second deletion should return 404')
    })
  })

  await test('delete passkey - isolation cases', async (t) => {
    const app = await build(t)

    await t.test('user can only delete their own passkeys', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Create passkeys for both users
      const passkey1 = await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey' })
      const passkey2 = await createTestPasskey(app, user2.userId, { name: 'User 2 Passkey' })

      assert.strictEqual(await getPasskeyCount(app, user1.userId), 1)
      assert.strictEqual(await getPasskeyCount(app, user2.userId), 1)

      // User1 can delete their own passkey
      const res1 = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey1.id}`,
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })
      assert.strictEqual(res1.statusCode, 204, 'User 1 should delete their own passkey')
      assert.strictEqual(await getPasskeyCount(app, user1.userId), 0)

      // User1 cannot delete user2's passkey
      const res2 = await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey2.id}`,
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })
      assert.strictEqual(res2.statusCode, 404, 'User 1 should not delete user 2 passkey')
      assert.strictEqual(await getPasskeyCount(app, user2.userId), 1, 'User 2 passkey should still exist')
    })

    await t.test('deleting one users passkey does not affect another user', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Create multiple passkeys for both users
      await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey 1' })
      const user1Passkey2 = await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey 2' })
      await createTestPasskey(app, user2.userId, { name: 'User 2 Passkey 1' })
      await createTestPasskey(app, user2.userId, { name: 'User 2 Passkey 2' })

      assert.strictEqual(await getPasskeyCount(app, user1.userId), 2)
      assert.strictEqual(await getPasskeyCount(app, user2.userId), 2)

      // Delete one of user1's passkeys
      await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${user1Passkey2.id}`,
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })

      // Verify user1 has 1 passkey, user2 still has 2
      assert.strictEqual(await getPasskeyCount(app, user1.userId), 1, 'User 1 should have 1 passkey')
      assert.strictEqual(await getPasskeyCount(app, user2.userId), 2, 'User 2 should still have 2 passkeys')
    })
  })
})
