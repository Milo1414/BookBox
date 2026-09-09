import type { Book } from '../types'
import { normalizeIsbn } from '../lib/books'
import { supabase } from '../lib/supabase'

export interface BookRow {
  id: string
  user_id: string
  slug: string
  title: string
  author: string
  cover_url: string | null
  cover_path?: string | null
  ownership: Book['ownership']
  reading_status: Book['readingStatus']
  priority: Book['priority']
  categories: string[] | null
  format: Book['format']
  isbn: string | null
  page_count?: number | null
  publisher?: string | null
  published?: string | null
  rating: number | null
  progress?: number | null
  why_read?: string | null
  notes?: string | null
  learnings?: string | null
  started_at: string | null
  finished_at: string | null
  epub_file_name?: string | null
  epub_path?: string | null
  epub_size_bytes?: number | null
  created_at: string
  updated_at?: string
}

export function fromRow(row: BookRow): Book {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_url,
    coverPath: row.cover_path ?? null,
    ownership: row.ownership,
    readingStatus: row.reading_status,
    priority: row.priority,
    categories: row.categories ?? [],
    format: row.format,
    isbn: row.isbn,
    pageCount: row.page_count == null ? null : Number(row.page_count),
    publisher: row.publisher ?? null,
    published: row.published ?? null,
    rating: row.rating == null ? null : Number(row.rating),
    progress: row.progress == null ? null : Number(row.progress),
    whyRead: row.why_read ?? null,
    notes: row.notes ?? null,
    learnings: row.learnings ?? null,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    epubFileName: row.epub_file_name ?? null,
    epubPath: row.epub_path ?? null,
    epubSizeBytes: row.epub_size_bytes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toInsert(book: Book, userId: string) {
  return {
    id: book.id,
    user_id: userId,
    slug: book.slug || book.id,
    title: book.title,
    author: book.author,
    cover_url: book.coverUrl ?? null,
    cover_path: book.coverPath ?? null,
    ownership: book.ownership,
    reading_status: book.readingStatus ?? null,
    priority: book.priority ?? null,
    categories: book.categories ?? [],
    format: book.format ?? null,
    isbn: normalizeIsbn(book.isbn),
    page_count: book.pageCount ?? null,
    publisher: book.publisher ?? null,
    published: book.published ?? null,
    rating: book.rating ?? null,
    progress: book.progress ?? null,
    why_read: book.whyRead ?? null,
    notes: book.notes ?? null,
    learnings: book.learnings ?? null,
    started_at: book.startedAt || null,
    finished_at: book.finishedAt || null,
    epub_file_name: book.epubFileName ?? null,
    epub_path: book.epubPath ?? null,
    epub_size_bytes: book.epubSizeBytes ?? null,
    created_at: book.createdAt,
  }
}

function requireClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export async function fetchCatalog(): Promise<Book[]> {
  const client = requireClient()
  const { data, error } = await client.from('books_catalog').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as BookRow[]).map(fromRow)
}

export async function fetchOwnBooks(): Promise<Book[]> {
  const client = requireClient()
  const { data, error } = await client.from('books').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as BookRow[]).map(fromRow)
}

export async function insertBook(book: Book, userId: string): Promise<Book> {
  const client = requireClient()
  const { data, error } = await client.from('books').insert(toInsert(book, userId)).select('*').single()
  if (error) throw error
  return fromRow(data as BookRow)
}

export async function insertBooks(books: Book[], userId: string): Promise<Book[]> {
  const client = requireClient()
  const rows = books.map((book) => toInsert(book, userId))
  const { data, error } = await client.from('books').insert(rows).select('*')
  if (error) throw error
  return ((data ?? []) as BookRow[]).map(fromRow)
}

export async function updateBook(book: Book, userId: string): Promise<Book> {
  const client = requireClient()
  const payload = toInsert(book, userId)
  const { id, created_at: _created, user_id: _user, epub_path, epub_file_name, epub_size_bytes, ...rest } = payload
  // Don't blank EPUB association if the client loaded the public catalog (no file fields).
  const patch = epub_path ? { ...rest, epub_path, epub_file_name, epub_size_bytes } : rest
  const { data, error } = await client.from('books').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return fromRow(data as BookRow)
}

export async function deleteBookRow(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('books').delete().eq('id', id)
  if (error) throw error
}
