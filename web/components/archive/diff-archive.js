export function diffArchive (oldArchive, newArchive) {
  const archiveDiff = {}
  for (const [key, newValue] of Object.entries(newArchive)) {
    const oldValue = oldArchive[key]
    if (newValue !== oldValue) archiveDiff[key] = newValue
  }

  return archiveDiff
}
