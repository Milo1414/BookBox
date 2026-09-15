import { CATEGORIES, PRIORITY_ORDER } from '../constants'
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

export function readingProgress(book: Pick<Book, 'readingStatus' | 'progress'>): number | null {
  if (book.readingStatus === 'read') return 100
  if (book.readingStatus !== 'reading') return null
  return clampProgress(book.progress)
}

export function currentPage(book: Pick<Book, 'readingStatus' | 'progress' | 'pageCount'>): number | null {
  const pages = clampPageCount(book.pageCount)
  if (!pages) return null
  if (book.readingStatus === 'read') return pages
  const percent = readingProgress(book)
  if (percent == null) return null
  return Math.max(0, Math.min(pages, Math.round((percent / 100) * pages)))
}

export function progressFromPage(page: number, pageCount: number): number | null {
  const pages = clampPageCount(pageCount)
  if (!pages) return null
  return clampProgress((page / pages) * 100)
}

export function hasCover(book: Book): boolean {
  return Boolean(book.coverUrl?.trim())
}

export function localIsoDate(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseBookDate(value?: string | null): Date | null {
  if (!value) return null
  const day = value.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [year, month, date] = day.split('-').map(Number)
    return new Date(year, month - 1, date)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function bookFinishedDate(book: Pick<Book, 'finishedAt' | 'createdAt'>): Date | null {
  const finished = parseBookDate(book.finishedAt)
  if (finished) return finished
  if (!book.createdAt) return null
  const created = new Date(book.createdAt)
  return Number.isNaN(created.getTime()) ? null : created
}

function sameMonth(date: Date, now: Date): boolean {
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function sumPages(books: Book[]): number {
  return books.reduce((total, book) => total + (clampPageCount(book.pageCount) ?? 0), 0)
}

export function readingStreakMonths(books: Book[], now = new Date()): number {
  const months = new Set<string>()
  for (const book of books) {
    const date = bookFinishedDate(book)
    if (!date) continue
    months.add(`${date.getFullYear()}-${date.getMonth()}`)
  }
  let streak = 0
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1)
  if (!months.has(`${cursor.getFullYear()}-${cursor.getMonth()}`)) {
    cursor.setMonth(cursor.getMonth() - 1)
  }
  while (months.has(`${cursor.getFullYear()}-${cursor.getMonth()}`)) {
    streak += 1
    cursor.setMonth(cursor.getMonth() - 1)
  }
  return streak
}

function compareFinishedDesc(a: Book, b: Book): number {
  const left = a.finishedAt || a.createdAt || ''
  const right = b.finishedAt || b.createdAt || ''
  return right.localeCompare(left)
}

export function readingReport(books: Book[], now = new Date()) {
  const owned = books.filter((book) => book.ownership === 'owned')
  const read = owned.filter((book) => book.readingStatus === 'read')
  const dated = read
    .map((book) => ({ book, date: bookFinishedDate(book) }))
    .filter((item): item is { book: Book; date: Date } => item.date != null)
  const monthBooks = dated.filter((item) => sameMonth(item.date, now)).map((item) => item.book)
  const yearBooks = dated.filter((item) => item.date.getFullYear() === now.getFullYear()).map((item) => item.book)
  const grouped = new Map<number, Book[]>()
  for (const item of dated) {
    const year = item.date.getFullYear()
    const list = grouped.get(year) ?? []
    list.push(item.book)
    grouped.set(year, list)
  }
  const yearGroups = [...grouped.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({ year, books: [...list].sort(compareFinishedDesc) }))
  return {
    owned: owned.length,
    pending: owned.filter((book) => book.readingStatus === 'pending').length,
    reading: owned.filter((book) => book.readingStatus === 'reading').length,
    wishlist: books.filter((book) => book.ownership === 'wishlist').length,
    readTotal: read.length,
    readMonth: monthBooks.length,
    readYear: yearBooks.length,
    pagesMonth: sumPages(monthBooks),
    pagesYear: sumPages(yearBooks),
    pagesTotal: sumPages(read),
    streakMonths: readingStreakMonths(read, now),
    yearBooks: [...yearBooks].sort(compareFinishedDesc),
    yearGroups,
  }
}

export interface DiscoverShelf {
  id: string
  title: string
  books: Book[]
  total: number
}

export function discoverShelves(books: Book[], limit = 24): DiscoverShelf[] {
  const shelves: DiscoverShelf[] = []
  const missingCover = books.filter((book) => !hasCover(book))
  if (missingCover.length > 0) {
    shelves.push({ id: 'sin-portada', title: 'Sin portada', books: missingCover.slice(0, limit), total: missingCover.length })
  }

  const authors = new Map<string, Book[]>()
  for (const book of books) {
    const author = book.author.trim()
    if (!author) continue
    const list = authors.get(author) ?? []
    list.push(book)
    authors.set(author, list)
  }
  const authorShelves = [...authors.entries()]
    .filter(([, list]) => list.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'es'))
    .slice(0, 6)
    .map(([author, list]) => ({
      id: `autor:${author}`,
      title: author,
      books: list.slice(0, limit),
      total: list.length,
    }))
  shelves.push(...authorShelves)

  const categoryShelves = CATEGORIES.map((category) => {
    const list = books.filter((book) => book.categories.includes(category))
    return { id: `cat:${category}`, title: category, books: list.slice(0, limit), total: list.length }
  })
    .filter((shelf) => shelf.total > 0)
    .sort((a, b) => b.total - a.total)
  shelves.push(...categoryShelves)

  return shelves
}

export function booksForShelf(books: Book[], shelfId: string): Book[] {
  if (shelfId === 'sin-portada') return books.filter((book) => !hasCover(book))
  if (shelfId.startsWith('autor:')) {
    const author = shelfId.slice(6)
    return books.filter((book) => book.author.trim() === author)
  }
  if (shelfId.startsWith('cat:')) {
    const category = shelfId.slice(4)
    return books.filter((book) => book.categories.includes(category))
  }
  return []
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
