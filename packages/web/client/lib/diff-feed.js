export function diffFeed (oldFeed, newFeed) {
  const feedDiff = {}

  for (const [key, newValue] of Object.entries(newFeed)) {
    const oldValue = oldFeed[key]

    if (newValue !== oldValue) feedDiff[key] = newValue
  }

  return feedDiff
}
