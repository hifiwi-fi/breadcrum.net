import t from 'tap'
import { page } from './client.js'
import { render } from 'uland-isomorphic'

t.test('Testing is set up and working', async t => {
  let rendered
  t.doesNotThrow(() => {
    rendered = render(String, page)
  }, 'page renders without error')
  t.equal(typeof rendered, 'string', 'page renders to string')
})
