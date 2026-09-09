import { CATALOG_CACHE_KEY, MIGRATION_KEY, STORAGE_KEY } from '../constants'
import { seedBooks } from '../data/seed'
import type { Book } from '../types'

function isBookArray(value: unknown): value is Book[] {
  return Array.isArray(value) && value.every((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
}

export function applySeedCovers(books: Book[]): Book[] {
  const covers = new Map(
    seedBooks.filter((book) => book.coverUrl).map((book) => [book.id, book.coverUrl as string]),
  )
  let changed = false
  const next = books.map((book) => {
    if (book.coverUrl) return book
    const coverUrl = covers.get(book.slug || book.id) ?? covers.get(book.id)
    if (!coverUrl) return book
    changed = true
    return { ...book, coverUrl }
  })
  return changed ? next : books
}

function fillMissingSeedCovers(books: Book[]): Book[] {
  const next = applySeedCovers(books)
  if (next !== books) saveLibrary(next)
  return next
}

export function readLocalBooks(): Book[] | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isBookArray(parsed)) return fillMissingSeedCovers(parsed)
    if (parsed && typeof parsed === 'object' && isBookArray((parsed as { books?: unknown }).books)) {
      return fillMissingSeedCovers((parsed as { books: Book[] }).books)
    }
  } catch {
    return null
  }
  return null
}

export function loadLibrary(): Book[] {
  const local = readLocalBooks()
  if (local) return local
  saveLibrary(seedBooks)
  return seedBooks
}

export function saveLibrary(books: Book[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ books }))
}

export function isMigrationDone(): boolean {
  return Boolean(localStorage.getItem(MIGRATION_KEY))
}

export function markMigrationDone(count: number): void {
  localStorage.setItem(MIGRATION_KEY, JSON.stringify({ at: new Date().toISOString(), count }))
}

export function readCatalogCache(): Book[] | null {
  const raw = localStorage.getItem(CATALOG_CACHE_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isBookArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeCatalogCache(books: Book[]): void {
  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(books))
}
