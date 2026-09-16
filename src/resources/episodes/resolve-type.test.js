import { equal } from 'node:assert'
import { test } from 'node:test'
import { resolveType } from './resolve-type.js'

/**
 * Test cases for resolveType function
 */

test('resolveType - should return audio for mp3 extension', () => {
  const metadata = { ext: 'mp3' }
  equal(resolveType(metadata), 'audio', 'Expected type to be audio for mp3 extension')
})

test('resolveType - should return audio for m4a extension', () => {
  const metadata = { ext: 'm4a' }
  equal(resolveType(metadata), 'audio', 'Expected type to be audio for m4a extension')
})

test('resolveType - should return video for mp4 extension', () => {
  const metadata = { ext: 'mp4' }
  equal(resolveType(metadata), 'video', 'Expected type to be video for mp4 extension')
})

test('resolveType - should return video for mov extension', () => {
  const metadata = { ext: 'mov' }
  equal(resolveType(metadata), 'video', 'Expected type to be video for mov extension')
})

test('resolveType - should return video for m3u8 extension', () => {
  const metadata = { ext: 'm3u8' }
  equal(resolveType(metadata), 'video', 'Expected type to be video for m3u8 extension')
})

test('resolveType - should return _type when ext is undefined', () => {
  const metadata = { _type: 'customType' }
  equal(resolveType(metadata), 'customType', 'Expected type to match _type when ext is undefined')
})
