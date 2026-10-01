/**
 * @import { DataDeps, GeneratedPageForLayout, PagesForLayout } from '@domstack/static/types.js'
 * @import { BlogIndexData } from '../globals/global.data.js'
 * @import { GlobalVars } from '../globals/global.vars.js'
 * @typedef {Pick<BlogIndexData, 'blogArchives'>} ArchiveData
 * @typedef {{ title: string, layout: 'blog-auto-index', noindex: true }} ArchiveVars
 * @typedef {PagesForLayout<'blog-auto-index', ArchiveVars, GlobalVars, ArchiveData>} ArchivePages
 */
import { posix } from 'node:path'

/** @satisfies {DataDeps<ArchiveData>} */
export const dataDeps = ['blogArchives']

/**
 * @param {Pick<Parameters<ArchivePages>[0], 'data'>} params
 * @returns {GeneratedPageForLayout<'blog-auto-index', ArchiveVars, Record<string, never>, GlobalVars>[]}
 */
export default function archivePages ({ data: { blogArchives } }) {
  return blogArchives.map(path => ({
    outputName: `${posix.basename(path)}/index.html`,
    vars: {
      title: `All ${posix.basename(path)} Blog Posts`,
      layout: 'blog-auto-index',
      noindex: true,
    },
    children: '',
  }))
}
