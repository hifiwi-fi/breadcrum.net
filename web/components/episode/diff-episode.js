
export function diffEpisode (oldEpisode, newEpisode) {
  const episodeDiff = {}
  for (const [key, newValue] of Object.entries(newEpisode)) {
    const oldValue = oldEpisode[key]
    if (newValue !== oldValue) episodeDiff[key] = newValue
  }

  return episodeDiff
}
