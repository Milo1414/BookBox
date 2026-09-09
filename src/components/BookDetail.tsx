import { useEffect, useRef, useState } from 'react'
import { FORMAT_OPTIONS, PRIORITY_ORDER, STATUS_OPTIONS } from '../constants'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { clampProgress } from '../lib/books'
import { formatBytes, friendlyError } from '../lib/errors'
import { formatDate, formatLabel, formatPages, formatPublished, priorityLabel, statusLabel } from '../lib/labels'
import { hrefForBook, navigate } from '../lib/routing'
import { clearBookFactsCache, lookupBookFacts } from '../services/search'
import { signedEpubUrl } from '../services/storage'
import type { Book, BookFacts, Format, Priority, ReadingStatus } from '../types'
import { BookCover } from './BookCover'
import { CategoryTag } from './CategoryTag'
import { ConfirmDialog } from './ConfirmDialog'
import { PriorityBadge } from './PriorityBadge'
import { StarRating } from './StarRating'
import { StatusBadge } from './StatusBadge'

interface BookDetailProps {
  book: Book
}

export function BookDetail({ book }: BookDetailProps) {
  const { isAdmin } = useAuth()
  const { upsertBook, deleteBook, showToast } = useLibrary()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [converting, setConverting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [convert, setConvert] = useState<{ format: Format; readingStatus: ReadingStatus; priority: Priority }>({
    format: 'epub',
    readingStatus: 'pending',
    priority: book.priority ?? 'medium',
  })
  const [lookedUp, setLookedUp] = useState<BookFacts | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupNonce, setLookupNonce] = useState(0)
  const bookRef = useRef(book)
  const upsertRef = useRef(upsertBook)
  bookRef.current = book
  upsertRef.current = upsertBook

  useEffect(() => {
    if (book.pageCount) {
      setLookedUp(null)
      setLookingUp(false)
      return
    }
    let cancelled = false
    setLookedUp(null)
    setLookingUp(true)
    const query = { title: book.title, author: book.author, isbn: book.isbn ?? undefined }
    if (lookupNonce > 0) clearBookFactsCache(query)
    void lookupBookFacts(query)
      .then((facts) => {
        if (cancelled) return
        setLookedUp(facts)
        const latest = bookRef.current
        if (!isAdmin || latest.pageCount || !facts.pageCount) return
        void upsertRef.current({
          ...latest,
          pageCount: facts.pageCount,
          publisher: latest.publisher ?? facts.publisher,
          published: latest.published ?? facts.published,
        }).catch(() => {})
      })
      .finally(() => {
        if (!cancelled) setLookingUp(false)
      })
    return () => {
      cancelled = true
    }
  }, [book.id, book.pageCount, book.title, book.author, book.isbn, isAdmin, lookupNonce])

  async function patch(partial: Partial<Book>) {
    try {
      await upsertBook({ ...book, ...partial })
      showToast('Actualizado.')
    } catch (error) {
      showToast(friendlyError(error))
    }
  }

  async function convertToOwned() {
    try {
      await upsertBook({
        ...book,
        ownership: 'owned',
        format: convert.format,
        readingStatus: convert.readingStatus,
        priority: convert.priority,
      })
      setConverting(false)
      showToast('Pasó a tu biblioteca.')
    } catch (error) {
      showToast(friendlyError(error))
    }
  }

  async function downloadEpub() {
    if (!book.epubPath) return
    setDownloading(true)
    try {
      const url = await signedEpubUrl(book.epubPath)
      const link = document.createElement('a')
      link.href = url
      link.download = book.epubFileName || 'libro.epub'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      showToast(friendlyError(error, 'No pude descargar el EPUB.'))
    } finally {
      setDownloading(false)
    }
  }

  const privateNotes = isAdmin && (book.whyRead || book.notes || book.learnings)
  const pageCount = book.pageCount ?? lookedUp?.pageCount ?? null
  const publisher = book.publisher ?? lookedUp?.publisher ?? null
  const published = book.published ?? lookedUp?.published ?? null
  const pagesLabel = formatPages(pageCount)
  const publishedLabel = formatPublished(published)
  const showFacts = Boolean(pagesLabel || lookingUp || book.isbn || publisher || publishedLabel)

  return (
    <article className="book-detail">
      <button type="button" className="text-link" onClick={() => history.back()}>
        ← Volver
      </button>

      <div className="detail-hero">
        <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} className="cover-lg" />
        <div className="detail-copy">
          <p className="eyebrow">{book.author}</p>
          <h1>{book.title}</h1>
          {book.readingStatus === 'read' && (isAdmin || book.rating) ? (
            <StarRating
              value={book.rating}
              onChange={isAdmin ? (rating) => void patch({ rating }) : undefined}
            />
          ) : null}

          <div className="detail-badges">
            <StatusBadge ownership={book.ownership} />
            <StatusBadge status={book.readingStatus} />
            <PriorityBadge priority={book.priority} />
            {book.format ? <span className="badge">{formatLabel[book.format]}</span> : null}
            {pagesLabel ? <span className="badge">{pagesLabel}</span> : null}
          </div>

          {showFacts || lookingUp || isAdmin ? (
            <dl className="detail-facts">
              <div>
                <dt>Páginas</dt>
                <dd>
                  {pagesLabel ?? (lookingUp ? 'Buscando…' : 'Sin dato')}
                  {!pagesLabel && !lookingUp && isAdmin ? (
                    <>
                      {' '}
                      <button type="button" className="text-link" onClick={() => setLookupNonce((value) => value + 1)}>
                        Buscar de nuevo
                      </button>
                    </>
                  ) : null}
                </dd>
              </div>
              {publisher ? (
                <div>
                  <dt>Editorial</dt>
                  <dd>{publisher}</dd>
                </div>
              ) : null}
              {publishedLabel ? (
                <div>
                  <dt>Publicación</dt>
                  <dd>{publishedLabel}</dd>
                </div>
              ) : null}
              {book.isbn ? (
                <div>
                  <dt>ISBN</dt>
                  <dd>{book.isbn}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {book.categories.length > 0 ? (
            <div className="tag-list">
              {book.categories.map((category) => (
                <CategoryTag key={category} category={category} />
              ))}
            </div>
          ) : null}

          {isAdmin ? (
            <>
              <div className="priority-edit">
                <span>Prioridad</span>
                <div className="chip-row">
                  {PRIORITY_ORDER.map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      className={`chip ${book.priority === priority ? 'is-active' : ''}`}
                      onClick={() => void patch({ priority })}
                    >
                      {priorityLabel[priority]}
                    </button>
                  ))}
                </div>
              </div>

              {book.ownership === 'owned' ? (
                <div className="priority-edit">
                  <span>Estado</span>
                  <div className="chip-row">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`chip ${book.readingStatus === status ? 'is-active' : ''}`}
                        onClick={() => {
                          if (status === 'pending') void patch({ readingStatus: status, progress: null, rating: null })
                          else if (status === 'read') void patch({ readingStatus: status, progress: 100 })
                          else void patch({ readingStatus: status, rating: null })
                        }}
                      >
                        {statusLabel[status]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {book.ownership === 'owned' && book.readingStatus === 'reading' ? (
                <ProgressEdit
                  value={book.progress ?? null}
                  onSave={(progress) => void patch({ progress })}
                />
              ) : null}

              <div className="detail-actions">
                <button type="button" className="btn btn-primary" onClick={() => navigate(`${hrefForBook(book)}/editar`)}>
                  Editar
                </button>
                {book.ownership === 'wishlist' ? (
                  <button type="button" className="btn btn-ghost" onClick={() => setConverting((open) => !open)}>
                    Lo tengo
                  </button>
                ) : null}
                <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
                  Eliminar
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {isAdmin && converting ? (
        <section className="panel">
          <h2>Convertir a “Lo tengo”</h2>
          <p className="muted">Se actualiza este mismo libro. No se crea un duplicado.</p>
          <div className="filter-selects">
            <label>
              <span>Formato</span>
              <select
                value={convert.format}
                onChange={(event) => setConvert((current) => ({ ...current, format: event.target.value as Format }))}
              >
                {FORMAT_OPTIONS.map((format) => (
                  <option key={format} value={format}>
                    {formatLabel[format]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select
                value={convert.readingStatus}
                onChange={(event) => setConvert((current) => ({ ...current, readingStatus: event.target.value as ReadingStatus }))}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Prioridad</span>
              <select
                value={convert.priority}
                onChange={(event) => setConvert((current) => ({ ...current, priority: event.target.value as Priority }))}
              >
                {PRIORITY_ORDER.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel[priority]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setConverting(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void convertToOwned()}>
              Confirmar
            </button>
          </div>
        </section>
      ) : null}

      {isAdmin && (book.epubPath || book.epubFileName) ? (
        <section className="panel">
          <h2>Archivo EPUB</h2>
          <p>
            Nombre: {book.epubFileName || 'libro.epub'}
            {formatBytes(book.epubSizeBytes) ? ` · ${formatBytes(book.epubSizeBytes)}` : ''}
          </p>
          <div className="detail-actions">
            {book.epubPath ? (
              <button type="button" className="btn btn-primary" onClick={() => void downloadEpub()} disabled={downloading}>
                {downloading ? 'Preparando…' : 'Descargar EPUB'}
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost" onClick={() => navigate(`${hrefForBook(book)}/epub`)}>
              Reemplazar EPUB
            </button>
          </div>
        </section>
      ) : isAdmin && book.ownership === 'owned' ? (
        <section className="panel">
          <h2>Archivo EPUB</h2>
          <p className="muted">Todavía no hay un EPUB asociado.</p>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`${hrefForBook(book)}/epub`)}>
            Subir EPUB
          </button>
        </section>
      ) : null}

      <div className="detail-notes">
        {isAdmin && book.whyRead ? (
          <section>
            <h2>¿Por qué quiero leerlo?</h2>
            <p>{book.whyRead}</p>
          </section>
        ) : null}
        {privateNotes && book.notes ? (
          <section>
            <h2>Notas</h2>
            <p>{book.notes}</p>
          </section>
        ) : null}
        {book.readingStatus === 'reading' && book.startedAt ? (
          <section>
            <h2>Inicio</h2>
            <p>{formatDate(book.startedAt)}</p>
          </section>
        ) : null}
        {book.readingStatus === 'read' ? (
          <>
            {book.finishedAt ? (
              <section>
                <h2>Finalización</h2>
                <p>{formatDate(book.finishedAt)}</p>
              </section>
            ) : null}
            {isAdmin && book.learnings ? (
              <section>
                <h2>Qué aprendí</h2>
                <p>{book.learnings}</p>
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title="Eliminar libro"
          text={`¿Seguro que quieres eliminar “${book.title}”? También se borrarán su portada y EPUB si existen.`}
          confirmLabel="Eliminar"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            void (async () => {
              try {
                await deleteBook(book.id)
                showToast('Libro eliminado.')
                navigate(book.ownership === 'wishlist' ? '/deseados' : '/biblioteca')
              } catch (error) {
                showToast(friendlyError(error, 'No pude eliminar el libro.'))
              }
            })()
          }}
        />
      ) : null}
    </article>
  )
}

function ProgressEdit({ value, onSave }: { value: number | null; onSave: (progress: number | null) => void }) {
  const [draft, setDraft] = useState(value == null ? '' : String(value))

  useEffect(() => {
    setDraft(value == null ? '' : String(value))
  }, [value])

  function commit() {
    const next = draft.trim() === '' ? null : clampProgress(Number(draft.replace(',', '.')))
    setDraft(next == null ? '' : String(next))
    if (next !== value) onSave(next)
  }

  return (
    <div className="priority-edit">
      <span>Avance</span>
      <div className="progress-edit">
        <input
          type="range"
          min={0}
          max={100}
          value={draft === '' ? 0 : Number(draft) || 0}
          aria-label="Porcentaje leído"
          onChange={(event) => setDraft(event.target.value)}
          onPointerUp={commit}
          onKeyUp={(event) => {
            if (event.key === 'Enter' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') commit()
          }}
        />
        <input
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          placeholder="%"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
          }}
        />
      </div>
      <p className="field-hint">Si lo dejás vacío, se muestra Leyendo sin porcentaje.</p>
    </div>
  )
}
