import { test } from 'tap'
import { resolveType } from './resolve-type.js'

/**
 * Test cases for resolveType function
 */

test('resolveType - should return audio for mp3 extension', async (t) => {
  const metadata = { ext: 'mp3' }
  t.equal(resolveType(metadata), 'audio', 'Expected type to be audio for mp3 extension')
  t.end()
})

test('resolveType - should return audio for m4a extension', async (t) => {
  const metadata = { ext: 'm4a' }
  t.equal(resolveType(metadata), 'audio', 'Expected type to be audio for m4a extension')
  t.end()
})

test('resolveType - should return video for mp4 extension', async (t) => {
  const metadata = { ext: 'mp4' }
  t.equal(resolveType(metadata), 'video', 'Expected type to be video for mp4 extension')
  t.end()
})

test('resolveType - should return video for mov extension', async (t) => {
  const metadata = { ext: 'mov' }
  t.equal(resolveType(metadata), 'video', 'Expected type to be video for mov extension')
  t.end()
})

test('resolveType - should return video for m3u8 extension', async (t) => {
  const metadata = { ext: 'm3u8' }
  t.equal(resolveType(metadata), 'video', 'Expected type to be video for m3u8 extension')
  t.end()
})

test('resolveType - should return _type when ext is undefined', async (t) => {
  const metadata = { _type: 'customType' }
  t.equal(resolveType(metadata), 'customType', 'Expected type to match _type when ext is undefined')
  t.end()
})
