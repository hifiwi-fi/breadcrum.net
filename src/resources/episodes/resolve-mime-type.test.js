import { equal } from 'node:assert'
import { test } from 'node:test'
import { resolveMimeType } from './resolve-mime-type.js'

test('resolveMimeType - returns audio/mpeg for mp3 extension', () => {
  const metadata = { ext: 'mp3', url: 'https://example.com/file.mp3' }
  equal(resolveMimeType(metadata), 'audio/mpeg')
})

test('resolveMimeType - returns audio/mp4 for m4a extension', () => {
  const metadata = { ext: 'm4a', url: 'https://example.com/file.m4a' }
  equal(resolveMimeType(metadata), 'audio/mp4')
})

test('resolveMimeType - returns video/mp4 for mp4 extension', () => {
  const metadata = { ext: 'mp4', url: 'https://example.com/file.mp4' }
  equal(resolveMimeType(metadata), 'video/mp4')
})

test('resolveMimeType - returns video/quicktime for mov extension', () => {
  const metadata = { ext: 'mov', url: 'https://example.com/file.mov' }
  equal(resolveMimeType(metadata), 'video/quicktime')
})

test('resolveMimeType - returns undefined for unknown extension', () => {
  const metadata = { ext: 'weirdext', url: 'https://example.com/file.weirdext' }
  equal(resolveMimeType(metadata), undefined)
})
