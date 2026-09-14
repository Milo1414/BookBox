import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { createBookId, createSlug, findDuplicate } from '../lib/books'
import {
  applySeedCovers,
  isMigrationDone,
  loadLibrary,
  markMigrationDone,
  readCatalogCache,
  readLocalBooks,
  saveLibrary,
  writeCatalogCache,
} from '../lib/storage'
import * as booksApi from '../services/books'
import { blobToWebp, urlToWebpBlob } from '../services/epub'
import { removeBookFiles, uploadCover, uploadEpub, uploadPdf } from '../services/storage'
import type { Book } from '../types'

interface ToastState {
  message: string
  id: number
}

interface LibraryContextValue {
  books: Book[]
  loading: boolean
  online: boolean
  source: 'supabase' | 'local' | 'cache'
  migrationPending: boolean
  busy: string | null
  toast: ToastState | null
  showToast: (message: string) => void
  dismissToast: () => void
  upsertBook: (book: Book, options?: { coverFile?: Blob | null; removeCover?: boolean }) => Promise<Book>
  attachBookFiles: (book: Book, files: { epub?: File | null; pdf?: File | null }, coverBlob?: Blob | null) => Promise<Book>
  deleteBook: (id: string) => Promise<void>
  getBook: (id: string) => Book | undefined
  importLocalToSupabase: () => Promise<void>
  refresh: () => Promise<void>
  exportLibrary: () => void
  importLibraryJson: (payload: unknown) => Promise<{ total: number; added: number; skipped: number }>
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function prepareForRemote(book: Book, existing: Book[]): Book {
  const id = isUuid(book.id) ? book.id : createBookId()
  const slug = book.slug || (!isUuid(book.id) ? book.id : createSlug(book.title, book.author, existing))
  return { ...book, id, slug, updatedAt: book.updatedAt ?? new Date().toISOString() }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, configured, loading: authLoading } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [source, setSource] = useState<'supabase' | 'local' | 'cache'>('local')
  const [migrationPending, setMigrationPending] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const refreshId = useRef(0)

  const showToast = useCallback((message: string) => {
    setToast({ message, id: Date.now() })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const refresh = useCallback(async () => {
    if (configured && authLoading) return
    const requestId = ++refreshId.current
    const apply = () => requestId === refreshId.current
    setLoading(true)
    try {
      if (!configured) {
        if (!apply()) return
        setBooks(loadLibrary())
        setSource('local')
        setMigrationPending(false)
        return
      }
      if (!navigator.onLine) {
        if (!apply()) return
        setOnline(false)
        setBooks(readCatalogCache() ?? readLocalBooks() ?? [])
        setSource('cache')
        return
      }
      setOnline(true)
      if (user) {
        const remote = await booksApi.fetchOwnBooks()
        if (!apply()) return
        if (remote.length > 0) {
          setBooks(remote)
          writeCatalogCache(remote)
          setSource('supabase')
          setMigrationPending(false)
          return
        }
        const local = readLocalBooks()
        if (local && local.length > 0 && !isMigrationDone()) {
          setBooks(local)
          setSource('local')
          setMigrationPending(true)
          return
        }
        setBooks([])
        setSource('supabase')
        setMigrationPending(false)
        return
      }
      const catalog = await booksApi.fetchCatalog()
      if (!apply()) return
      if (catalog.length > 0) {
        setBooks(catalog)
        writeCatalogCache(catalog)
        setSource('supabase')
        setMigrationPending(false)
        return
      }
      setBooks(readCatalogCache() ?? [])
      setSource('supabase')
    } catch (error) {
      console.error(error)
      if (!apply()) return
      setOnline(false)
      setBooks(readCatalogCache() ?? readLocalBooks() ?? (configured ? [] : loadLibrary()))
      setSource('cache')
    } finally {
      if (apply()) setLoading(false)
    }
  }, [authLoading, configured, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
      void refresh()
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refresh])

  const persistLocal = useCallback((next: Book[]) => {
    setBooks(next)
    if (!configured || migrationPending || source !== 'supabase') saveLibrary(next)
  }, [configured, migrationPending, source])

  const upsertBook = useCallback(
    async (input: Book, options?: { coverFile?: Blob | null; removeCover?: boolean }) => {
      if (!isAdmin) throw new Error('No tenés permiso para hacer eso.')
      const userId = user?.id
      const existing = books.find((item) => item.id === input.id)
      let book: Book = {
        ...existing,
        ...input,
        id: input.id || existing?.id || createBookId(),
        slug: input.slug || existing?.slug || createSlug(input.title, input.author, books),
        updatedAt: new Date().toISOString(),
        createdAt: input.createdAt || existing?.createdAt || new Date().toISOString(),
        epubPath: input.epubPath ?? existing?.epubPath ?? null,
        epubFileName: input.epubFileName ?? existing?.epubFileName ?? null,
        epubSizeBytes: input.epubSizeBytes ?? existing?.epubSizeBytes ?? null,
        pdfPath: input.pdfPath ?? existing?.pdfPath ?? null,
        pdfFileName: input.pdfFileName ?? existing?.pdfFileName ?? null,
        pdfSizeBytes: input.pdfSizeBytes ?? existing?.pdfSizeBytes ?? null,
        coverPath: options?.removeCover ? null : (input.coverPath ?? existing?.coverPath ?? null),
        progress: input.progress !== undefined ? input.progress : existing?.progress ?? null,
        pageCount: input.pageCount !== undefined ? input.pageCount : existing?.pageCount ?? null,
        publisher: input.publisher !== undefined ? input.publisher : existing?.publisher ?? null,
        published: input.published !== undefined ? input.published : existing?.published ?? null,
      }

      const shouldRemote = Boolean(configured && userId && !migrationPending)

      try {
        if (shouldRemote && userId) {
          if (options?.removeCover && book.coverPath) {
            await removeBookFiles(book.coverPath, null)
            book = { ...book, coverPath: null, coverUrl: null }
          }
          if (options?.coverFile) {
            setBusy('Guardando portada...')
            const webp = await blobToWebp(options.coverFile)
            const uploaded = await uploadCover(userId, book.id, webp)
            if (book.coverPath && book.coverPath !== uploaded.path) await removeBookFiles(book.coverPath, null)
            book = { ...book, coverPath: uploaded.path, coverUrl: uploaded.url }
          } else if (book.coverUrl && !book.coverUrl.startsWith('blob:') && !book.coverPath && !book.coverUrl.includes('/storage/v1/object/public/book-covers/')) {
            setBusy('Guardando portada...')
            const blob = await urlToWebpBlob(book.coverUrl)
            if (blob) {
              const uploaded = await uploadCover(userId, book.id, blob)
              book = { ...book, coverPath: uploaded.path, coverUrl: uploaded.url }
            }
          }
          setBusy('Guardando...')
          const exists = books.some((item) => item.id === book.id)
          const saved = exists ? await booksApi.updateBook(book, userId) : await booksApi.insertBook(book, userId)
          setBooks((current) => (current.some((item) => item.id === saved.id) ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current]))
          return saved
        }

        const next = books.some((item) => item.id === book.id) ? books.map((item) => (item.id === book.id ? book : item)) : [book, ...books]
        persistLocal(next)
        return book
      } finally {
        setBusy(null)
      }
    },
    [books, configured, isAdmin, migrationPending, persistLocal, user],
  )

  const deleteBook = useCallback(
    async (id: string) => {
      if (!isAdmin) throw new Error('No tenés permiso para hacer eso.')
      const book = books.find((item) => item.id === id || item.slug === id)
      if (!book) return
      if (configured && user && !migrationPending) {
        setBusy('Eliminando...')
        try {
          await removeBookFiles(book.coverPath, book.epubPath, book.pdfPath)
          await booksApi.deleteBookRow(book.id)
          setBooks((current) => current.filter((item) => item.id !== book.id))
        } finally {
          setBusy(null)
        }
        return
      }
      persistLocal(books.filter((item) => item.id !== book.id))
    },
    [books, configured, isAdmin, migrationPending, persistLocal, user],
  )

  const attachBookFiles = useCallback(
    async (book: Book, files: { epub?: File | null; pdf?: File | null }, coverBlob?: Blob | null) => {
      if (!isAdmin) throw new Error('No tenés permiso para hacer eso.')
      const userId = user?.id
      const epub = files.epub ?? null
      const pdf = files.pdf ?? null
      let next: Book = { ...book }
      if (epub || pdf) {
        next = {
          ...next,
          format: next.format === 'physical' || next.format === 'both' ? 'both' : 'epub',
        }
      }
      if (epub) {
        next = { ...next, epubFileName: epub.name, epubSizeBytes: epub.size }
      }
      if (pdf) {
        next = { ...next, pdfFileName: pdf.name, pdfSizeBytes: pdf.size }
      }
      if (userId && configured && !migrationPending && (epub || pdf)) {
        setBusy(epub && pdf ? 'Subiendo EPUB y PDF...' : epub ? 'Subiendo EPUB...' : 'Subiendo PDF...')
        const [epubUploaded, pdfUploaded] = await Promise.all([
          epub ? uploadEpub(userId, book.id, epub) : Promise.resolve(null),
          pdf ? uploadPdf(userId, book.id, pdf) : Promise.resolve(null),
        ])
        if (epubUploaded) next = { ...next, epubPath: epubUploaded.path, epubSizeBytes: epubUploaded.size }
        if (pdfUploaded) next = { ...next, pdfPath: pdfUploaded.path, pdfSizeBytes: pdfUploaded.size }
      }
      setBusy('Guardando...')
      return upsertBook(next, { coverFile: coverBlob ?? undefined })
    },
    [configured, isAdmin, migrationPending, upsertBook, user],
  )

  const booksWithCovers = useMemo(() => applySeedCovers(books), [books])
  const getBook = useCallback(
    (id: string) => booksWithCovers.find((book) => book.id === id || book.slug === id),
    [booksWithCovers],
  )

  const importLocalToSupabase = useCallback(async () => {
    if (!user) throw new Error('Tenés que ingresar para importar.')
    const local = readLocalBooks() ?? books
    if (!local.length) throw new Error('No hay una biblioteca local para importar.')
    setBusy('Importando biblioteca...')
    try {
      const prepared: Book[] = []
      for (const book of local) {
        prepared.push(prepareForRemote(book, [...prepared, ...local]))
      }
      const inserted = await booksApi.insertBooks(prepared, user.id)
      if (inserted.length !== prepared.length) throw new Error('La importación no coincidió con la cantidad de libros.')
      markMigrationDone(inserted.length)
      writeCatalogCache(inserted)
      setBooks(inserted)
      setSource('supabase')
      setMigrationPending(false)
    } finally {
      setBusy(null)
    }
  }, [books, user])

  const exportLibrary = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      books: books.map((book) => ({
        ...book,
        epubPath: book.epubPath ?? null,
        pdfPath: book.pdfPath ?? null,
        coverPath: book.coverPath ?? null,
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'library-backup.json'
    link.click()
    URL.revokeObjectURL(url)
  }, [books])

  const importLibraryJson = useCallback(
    async (payload: unknown) => {
      if (!isAdmin) throw new Error('No tenés permiso para hacer eso.')
      const parsed = payload as { books?: Book[] }
      const incoming = Array.isArray(parsed) ? parsed : parsed.books
      if (!Array.isArray(incoming)) throw new Error('El JSON no tiene una biblioteca reconocible.')
      let added = 0
      let skipped = 0
      let working = [...books]
      for (const raw of incoming) {
        if (!raw?.title || !raw?.author) {
          skipped += 1
          continue
        }
        const duplicate = findDuplicate(working, raw.title, raw.author, raw.isbn)
        if (duplicate) {
          skipped += 1
          continue
        }
        const next: Book = {
          ...raw,
          id: isUuid(raw.id) ? raw.id : createBookId(),
          slug: raw.slug || createSlug(raw.title, raw.author, working),
          categories: raw.categories ?? [],
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        if (configured && user && !migrationPending) {
          const saved = await booksApi.insertBook(next, user.id)
          working = [saved, ...working]
        } else {
          working = [next, ...working]
        }
        added += 1
      }
      if (!configured || migrationPending) persistLocal(working)
      else setBooks(working)
      return { total: incoming.length, added, skipped }
    },
    [books, configured, isAdmin, migrationPending, persistLocal, user],
  )

  const value = useMemo(
    () => ({
      books: booksWithCovers,
      loading,
      online,
      source,
      migrationPending,
      busy,
      toast,
      showToast,
      dismissToast,
      upsertBook,
      attachBookFiles,
      deleteBook,
      getBook,
      importLocalToSupabase,
      refresh,
      exportLibrary,
      importLibraryJson,
    }),
    [
      booksWithCovers,
      loading,
      online,
      source,
      migrationPending,
      busy,
      toast,
      showToast,
      dismissToast,
      upsertBook,
      attachBookFiles,
      deleteBook,
      getBook,
      importLocalToSupabase,
      refresh,
      exportLibrary,
      importLibraryJson,
    ],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
  const context = useContext(LibraryContext)
  if (!context) throw new Error('useLibrary debe usarse dentro de LibraryProvider')
  return context
}
