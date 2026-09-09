import JSZip from 'jszip'
import { MAX_EPUB_BYTES } from '../constants'
import type { EpubMetadata } from '../types'

function textContent(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function attr(el: Element | null, name: string): string | null {
  return el?.getAttribute(name) ?? null
}

function resolveHref(opfPath: string, href: string): string {
  const base = opfPath.split('/').slice(0, -1).join('/')
  const combined = base ? `${base}/${href}` : href
  return combined.replace(/\\/g, '/').split('/').reduce<string[]>((acc, part) => {
    if (part === '..') acc.pop()
    else if (part && part !== '.') acc.push(part)
    return acc
  }, []).join('/')
}

function extractPageCount(opf: Document): number | null {
  const metas = [...opf.getElementsByTagName('meta')]
  for (const meta of metas) {
    const name = `${meta.getAttribute('name') ?? meta.getAttribute('property') ?? ''}`.toLowerCase()
    if (!name) continue
    const mentionsPages = name.includes('page-count') || name.includes('numberofpages') || name.includes('number-of-pages') || name.endsWith(':pages') || name === 'pages'
    if (!mentionsPages) continue
    const raw = Number(meta.getAttribute('content') || textContent(meta))
    if (raw >= 1 && raw <= 20000) return Math.round(raw)
  }
  return null
}

function extractPublished(opf: Document): string | null {
  const value = textContent(opf.getElementsByTagName('dc:date')[0] ?? opf.getElementsByTagName('date')[0])
  return value || null
}

function extractIsbn(opf: Document): string | null {
  const identifiers = [...opf.getElementsByTagName('dc:identifier'), ...opf.getElementsByTagName('identifier')]
  for (const node of identifiers) {
    const scheme = `${node.getAttribute('opf:scheme') ?? node.getAttribute('scheme') ?? ''}`.toLowerCase()
    const value = textContent(node).replace(/[-\s]/g, '')
    if (scheme.includes('isbn') && value) return value
    if (/^(97[89]\d{10}|\d{9}[\dX])$/i.test(value)) return value
  }
  const metaIsbn = [...opf.getElementsByTagName('meta')].find((meta) => {
    const name = `${meta.getAttribute('name') ?? meta.getAttribute('property') ?? ''}`.toLowerCase()
    return name.includes('isbn')
  })
  const fromMeta = textContent(metaIsbn ?? null).replace(/[-\s]/g, '')
  return fromMeta || null
}

function findCoverHref(opf: Document): string | null {
  const metas = [...opf.getElementsByTagName('meta')]
  const coverMeta = metas.find((meta) => (meta.getAttribute('name') ?? '').toLowerCase() === 'cover')
  const coverId = coverMeta?.getAttribute('content')
  const items = [...opf.getElementsByTagName('item')]
  const byId = coverId ? items.find((item) => item.getAttribute('id') === coverId) : null
  if (byId?.getAttribute('href')) return byId.getAttribute('href')
  const byProp = items.find((item) => (item.getAttribute('properties') ?? '').includes('cover-image'))
  if (byProp?.getAttribute('href')) return byProp.getAttribute('href')
  const image = items.find((item) => (item.getAttribute('media-type') ?? '').startsWith('image/'))
  return image?.getAttribute('href') ?? null
}

export async function blobToWebp(blob: Blob, maxSize = 900): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return blob
  ctx.drawImage(bitmap, 0, 0, width, height)
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84))
  if (webp && webp.size > 0) return webp
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84))
  return jpeg ?? blob
}

export async function urlToWebpBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    if (blob.size < 1500) return null
    if (!blob.type.startsWith('image/') && blob.type !== 'application/octet-stream') return null
    return blobToWebp(blob)
  } catch {
    return null
  }
}

export function isEpubFile(file: File): boolean {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return name.endsWith('.epub') || type.includes('epub') || type === 'application/zip'
}

export async function parseEpub(file: File): Promise<EpubMetadata> {
  if (file.size > MAX_EPUB_BYTES) throw new Error('El archivo es demasiado grande.')
  if (!isEpubFile(file)) throw new Error('Ese archivo no parece un EPUB válido.')

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error('Ese archivo no parece un EPUB válido.')
  }

  const containerFile = zip.file('META-INF/container.xml')
  if (!containerFile) throw new Error('Ese archivo no parece un EPUB válido.')
  const containerXml = await containerFile.async('text')
  const container = new DOMParser().parseFromString(containerXml, 'application/xml')
  const rootfile = container.querySelector('rootfile')
  const opfPath = attr(rootfile, 'full-path')
  if (!opfPath) throw new Error('No pude leer la metadata del EPUB.')

  const opfFile = zip.file(opfPath)
  if (!opfFile) throw new Error('No pude leer la metadata del EPUB.')
  const opfXml = await opfFile.async('text')
  const opf = new DOMParser().parseFromString(opfXml, 'application/xml')

  const title = textContent(opf.getElementsByTagName('dc:title')[0] ?? opf.getElementsByTagName('title')[0])
  const author = textContent(opf.getElementsByTagName('dc:creator')[0] ?? opf.getElementsByTagName('creator')[0])
  const publisher = textContent(opf.getElementsByTagName('dc:publisher')[0] ?? opf.getElementsByTagName('publisher')[0]) || null
  const language = textContent(opf.getElementsByTagName('dc:language')[0] ?? opf.getElementsByTagName('language')[0]) || null
  const isbn = extractIsbn(opf)
  const pageCount = extractPageCount(opf)
  const published = extractPublished(opf)

  let coverBlob: Blob | null = null
  let coverUrl: string | null = null
  const coverHref = findCoverHref(opf)
  if (coverHref) {
    const coverPath = resolveHref(opfPath, coverHref)
    const coverFile = zip.file(coverPath) ?? zip.file(decodeURIComponent(coverPath))
    if (coverFile) {
      const raw = await coverFile.async('blob')
      coverBlob = await blobToWebp(raw)
      coverUrl = URL.createObjectURL(coverBlob)
    }
  }

  return {
    title: title || file.name.replace(/\.epub$/i, '').replace(/[_-]+/g, ' '),
    author: author || 'Autor desconocido',
    isbn,
    publisher,
    published,
    pageCount,
    language,
    coverBlob,
    coverUrl,
    fileName: file.name,
    sizeBytes: file.size,
  }
}
