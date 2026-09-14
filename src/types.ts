export type Ownership = 'owned' | 'wishlist'
export type ReadingStatus = 'pending' | 'reading' | 'read'
export type Priority = 'now' | 'high' | 'medium' | 'low'
export type Format = 'epub' | 'physical' | 'both'

export interface Book {
  id: string
  userId?: string
  slug?: string
  title: string
  author: string
  coverUrl?: string | null
  coverPath?: string | null
  ownership: Ownership
  readingStatus?: ReadingStatus | null
  priority?: Priority | null
  categories: string[]
  format?: Format | null
  isbn?: string | null
  pageCount?: number | null
  publisher?: string | null
  published?: string | null
  rating?: number | null
  whyRead?: string | null
  notes?: string | null
  learnings?: string | null
  progress?: number | null
  startedAt?: string | null
  finishedAt?: string | null
  epubFileName?: string | null
  epubPath?: string | null
  epubSizeBytes?: number | null
  pdfFileName?: string | null
  pdfPath?: string | null
  pdfSizeBytes?: number | null
  createdAt: string
  updatedAt?: string
}

export interface SeedFile {
  meta: {
    description: string
    ownedCount: number
    wishlistCount: number
    priorityOrder: Priority[]
    note: string
  }
  books: Book[]
}

export type ReadingFilter = 'all' | ReadingStatus
export type SortKey = 'priority' | 'title' | 'author' | 'createdAt'

export interface LibraryFilters {
  query: string
  reading: ReadingFilter
  priority: Priority | 'all'
  category: string | 'all'
  sort: SortKey
}

export interface CoverCandidate {
  url: string
  source: string
  label: string
}

export interface ExternalBookHit {
  title: string
  author: string
  isbn?: string | null
  coverUrl?: string | null
  publisher?: string | null
  published?: string | null
  pageCount?: number | null
  subjects?: string[]
  source: string
}

export interface BookFacts {
  pageCount: number | null
  publisher: string | null
  published: string | null
}

export interface EpubMetadata {
  title: string
  author: string
  isbn: string | null
  publisher: string | null
  published: string | null
  pageCount: number | null
  language: string | null
  subjects: string[]
  coverBlob: Blob | null
  coverUrl: string | null
  fileName: string
  sizeBytes: number
}
