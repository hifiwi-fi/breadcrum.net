import tap from 'tap'
import { foo } from './index.js'

tap.test('exports', async (t) => {
  t.ok(foo)
  t.equal(foo.bar, 'baz', 'exports as expected')
})
