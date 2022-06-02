function equalSet (a, b) {
  if (a.size !== b.size) {
    return false
  }

  return Array.from(a).every(element => {
    return b.has(element)
  })
}

export function diffUpdate (oldBookmark, newBookmark) {
  const bookmarkDiff = {}
  for (const [key, newValue] of Object.entries(newBookmark)) {
    const oldValue = oldBookmark[key]
    if (key === 'tags') {
      const oldTags = new Set(oldValue)
      const newTags = new Set(newValue)
      if (!equalSet(oldTags, newTags)) bookmarkDiff[key] = newValue
    } else {
      if (newValue !== oldValue) bookmarkDiff[key] = newValue
    }
  }

  return bookmarkDiff
}
