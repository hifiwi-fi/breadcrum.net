// This is just a temp cache till we
// get redis caching working

import LRU from 'lru-cache'

export const cache = new LRU({
  max: 10000,
  ttl: 1000 * 60 * 5, // 20 mins,
  updateAgeOnGet: false,
  ttlAutopurge: true
})
