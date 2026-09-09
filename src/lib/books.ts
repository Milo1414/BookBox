import { PRIORITY_ORDER } from '../constants'
import type { Book, LibraryFilters, Priority } from '../types'

const priorityRank: Record<Priority, number> = {
  now: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeIsbn(value?: string | null): string | null {
  if (!value) return null
  const compact = value.replace(/[-\s]/g, '').toUpperCase()
  return compact || null
}

export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createBookId(): string {
  return crypto.randomUUID()
}

export function createSlug(title: string, author: string, existing: Book[]): string {
  const base = `${slugify(title)}-${slugify(author)}` || `libro-${Date.now()}`
  if (!existing.some((book) => (book.slug ?? book.id) === base)) return base
  return `${base}-${Date.now()}`
}

export function bookHrefId(book: Book): string {
  return book.slug || book.id
}

export function findDuplicate(books: Book[], title: string, author: string, isbn?: string | null, exceptId?: string): Book | undefined {
  const isbnKey = normalizeIsbn(isbn)
  if (isbnKey) {
    const byIsbn = books.find((book) => book.id !== exceptId && normalizeIsbn(book.isbn) === isbnKey)
    if (byIsbn) return byIsbn
  }
  const t = normalizeText(title)
  const a = normalizeText(author)
  if (!t || !a) return undefined
  return books.find((book) => book.id !== exceptId && normalizeText(book.title) === t && normalizeText(book.author) === a)
}

export function comparePriority(a?: Priority | null, b?: Priority | null): number {
  const left = a ? priorityRank[a] : 99
  const right = b ? priorityRank[b] : 99
  return left - right
}

export function ownedPending(books: Book[]): Book[] {
  return books.filter((book) => book.ownership === 'owned' && book.readingStatus === 'pending')
}

export function currentlyReading(books: Book[]): Book[] {
  return books.filter((book) => book.ownership === 'owned' && book.readingStatus === 'reading')
}

export function nextUp(books: Book[], limit = 5): Book[] {
  return [...ownedPending(books)].sort(sortByPriorityThenTitle).slice(0, limit)
}

export function featuredReading(books: Book[]): Book | undefined {
  return currentlyReading(books)[0] ?? nextUp(books, 1)[0]
}

export function homeNextReads(books: Book[], limit = 10): Book[] {
  const seen = new Set<string>()
  const out: Book[] = []
  for (const book of [...currentlyReading(books), ...nextUp(books, limit)]) {
    if (seen.has(book.id)) continue
    seen.add(book.id)
    out.push(book)
    if (out.length >= limit) break
  }
  return out
}

export function homeWishlist(books: Book[], limit = 10): Book[] {
  return books.filter((book) => book.ownership === 'wishlist').slice(0, limit)
}

export function clampProgress(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function clampPageCount(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  const pages = Math.round(value)
  if (pages < 1 || pages > 20000) return null
  return pages
}

export function readingProgress(book: Book): number | null {
  if (book.readingStatus === 'read') return 100
  if (book.readingStatus !== 'reading') return null
  return clampProgress(book.progress)
}

export function bookQuote(book: Book): string {
  const quote = book.whyRead || book.notes || book.learnings
  if (quote?.trim()) return quote.trim()
  return 'Un pequeño cambio en tu forma de ver a las personas puede hacer una gran diferencia.'
}

function sortByPriorityThenTitle(a: Book, b: Book): number {
  const byPriority = comparePriority(a.priority, b.priority)
  if (byPriority !== 0) return byPriority
  return a.title.localeCompare(b.title, 'es')
}

export function pickNextReads(books: Book[], count = 3): Book[] {
  const groups = new Map<Priority | 'none', Book[]>()
  for (const book of ownedPending(books)) {
    const key = book.priority ?? 'none'
    const list = groups.get(key) ?? []
    list.push(book)
    groups.set(key, list)
  }

  const picked: Book[] = []
  for (const priority of [...PRIORITY_ORDER, 'none'] as const) {
    const group = groups.get(priority)
    if (!group?.length) continue
    const shuffled = shuffle(group)
    picked.push(...shuffled)
    if (picked.length >= count) break
  }

  return picked.slice(0, count)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function applyFilters(books: Book[], filters: LibraryFilters, ownership?: Book['ownership']): Book[] {
  const query = normalizeText(filters.query)

  return books
    .filter((book) => (ownership ? book.ownership === ownership : true))
    .filter((book) => {
      if (!query) return true
      return normalizeText(book.title).includes(query) || normalizeText(book.author).includes(query)
    })
    .filter((book) => {
      if (filters.reading === 'all') return true
      return book.readingStatus === filters.reading
    })
    .filter((book) => {
      if (filters.priority === 'all') return true
      return book.priority === filters.priority
    })
    .filter((book) => {
      if (filters.category === 'all') return true
      return book.categories.includes(filters.category)
    })
    .sort((a, b) => {
      switch (filters.sort) {
        case 'title':
          return a.title.localeCompare(b.title, 'es')
        case 'author':
          return a.author.localeCompare(b.author, 'es') || a.title.localeCompare(b.title, 'es')
        case 'createdAt':
          return b.createdAt.localeCompare(a.createdAt)
        case 'priority':
        default:
          return sortByPriorityThenTitle(a, b)
      }
    })
}

export function libraryStats(books: Book[]) {
  const owned = books.filter((book) => book.ownership === 'owned')
  return {
    owned: owned.length,
    pending: owned.filter((book) => book.readingStatus === 'pending').length,
    reading: owned.filter((book) => book.readingStatus === 'reading').length,
    read: owned.filter((book) => book.readingStatus === 'read').length,
    wishlist: books.filter((book) => book.ownership === 'wishlist').length,
  }
}

export function coverPalette(title: string): { from: string; to: string } {
  const palettes = [
    { from: '#3a2418', to: '#c4925e' },
    { from: '#1d2a33', to: '#7ea8b8' },
    { from: '#2a1d2e', to: '#b88aa8' },
    { from: '#1f2a22', to: '#7fa67a' },
    { from: '#33241a', to: '#d4a06a' },
    { from: '#241c18', to: '#8c6a52' },
    { from: '#1a2430', to: '#6b8cae' },
    { from: '#2c2218', to: '#c4b07a' },
  ]
  let hash = 0
  for (let i = 0; i < title.length; i += 1) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palettes[Math.abs(hash) % palettes.length]
}
