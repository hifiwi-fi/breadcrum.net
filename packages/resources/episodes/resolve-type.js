export function resolveType (metadata) {
  return (
    ['mp3', 'm4a'].includes(metadata.ext)
      ? 'audio'
      : ['mp4', 'mov', 'm3u8'].includes(metadata.ext)
          ? 'video'
          : metadata._type
  )
}
