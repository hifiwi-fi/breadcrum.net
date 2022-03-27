import t from 'tap'
import { homepage } from './client.js'

t.test('Testing is set up and working', async t => {
  t.doesNotThrow(homepage, 'homepage renders without error')
})
