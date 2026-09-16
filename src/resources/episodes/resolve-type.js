/**
 * @param {object} media
 * @param {string} [media.ext]
 * @param {string} [media._type]
 * @return {'audio' | 'video' | string | undefined }
 */
export function resolveType (media) {
  return (
    ['mp3', 'm4a'].includes(media.ext ?? '')
      ? 'audio'
      : ['mp4', 'mov', 'm3u8'].includes(media.ext ?? '')
          ? 'video'
          : media._type
  )
}
