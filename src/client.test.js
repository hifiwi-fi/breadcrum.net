import t from 'tap'
import { somethingCool } from './client.js'

t.test('Testing is set up and working', async t => {
  t.equal(somethingCool(), 'cool')
})
