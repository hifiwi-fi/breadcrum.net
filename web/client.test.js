import t from 'tap'
import { page } from './client.js'

t.test('Testing is set up and working', async t => {
  t.doesNotThrow(page, 'homepage renders without error')
})
