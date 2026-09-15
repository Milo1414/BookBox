import { useMemo, useState, type FormEvent } from 'react'
import { CATEGORIES, FORMAT_OPTIONS, OWNERSHIP_OPTIONS, PRIORITY_ORDER, STATUS_OPTIONS } from '../constants'
import { useLibrary } from '../context/LibraryContext'
import { createBookId, createSlug, clampPageCount, clampProgress, findDuplicate, localIsoDate, progressFromPage } from '../lib/books'
import { friendlyError } from '../lib/errors'
import { formatLabel, ownershipLabel, priorityLabel, statusLabel } from '../lib/labels'
import { hrefForBook, navigate } from '../lib/routing'
import { blobToWebp } from '../services/epub'
import { mapSubjectsToCategories } from '../lib/categories'
import { searchCoverCandidates, searchExternalBooks } from '../services/search'
import type { Book, CoverCandidate, ExternalBookHit, Format, Ownership, Priority, ReadingStatus } from '../types'
import { BookCover } from './BookCover'
import { CategoryTag } from './CategoryTag'
import { DuplicateDialog } from './DuplicateDialog'
import { StarRating } from './StarRating'

interface BookFormProps {
  book?: Book
}

interface FormState {
  title: string
  author: string
  coverUrl: string
  ownership: Ownership
  readingStatus: ReadingStatus
  priority: Priority
  categories: string[]
  format: Format
  isbn: string
  pageCount: string
  publisher: string
  published: string
  progress: string
  rating: string
  whyRead: string
  notes: string
  learnings: string
  startedAt: string
  finishedAt: string
}

function toState(book?: Book): FormState {
  return {
    title: book?.title ?? '',
    author: book?.author ?? '',
    coverUrl: book?.coverUrl ?? '',
    ownership: book?.ownership ?? 'owned',
    readingStatus: book?.readingStatus ?? 'pending',
    priority: book?.priority ?? 'medium',
    categories: book?.categories ?? [],
    format: book?.format ?? 'epub',
    isbn: book?.isbn ?? '',
    pageCount: book?.pageCount != null ? String(book.pageCount) : '',
    publisher: book?.publisher ?? '',
    published: book?.published ?? '',
    progress: book?.progress != null ? String(book.progress) : '',
    rating: book?.rating != null ? String(book.rating) : '',
    whyRead: book?.whyRead ?? '',
    notes: book?.notes ?? '',
    learnings: book?.learnings ?? '',
    startedAt: book?.startedAt?.slice(0, 10) ?? '',
    finishedAt: book?.finishedAt?.slice(0, 10) ?? '',
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function BookForm({ book }: BookFormProps) {
  const { books, upsertBook, showToast } = useLibrary()
  const [state, setState] = useState<FormState>(() => toState(book))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [coverFile, setCoverFile] = useState<Blob | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hits, setHits] = useState<ExternalBookHit[]>([])
  const [searching, setSearching] = useState(false)
  const [covers, setCovers] = useState<CoverCandidate[]>([])
  const [coverStatus, setCoverStatus] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<Book | null>(null)
  const [forceCreate, setForceCreate] = useState(false)

  const isWishlist = state.ownership === 'wishlist'
  const isReading = !isWishlist && state.readingStatus === 'reading'
  const isRead = !isWishlist && state.readingStatus === 'read'

  const possibleDuplicate = useMemo(
    () => findDuplicate(books, state.title, state.author, state.isbn, book?.id),
    [books, state.title, state.author, state.isbn, book?.id],
  )

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }))
  }

  function toggleCategory(category: string) {
    setState((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }))
  }

  async function onLocalCover(file: File | undefined) {
    if (!file) return
    const webp = await blobToWebp(file)
    setCoverFile(webp)
    setRemoveCover(false)
    update('coverUrl', URL.createObjectURL(webp))
  }

  async function onSearchBooks() {
    setSearching(true)
    setError(null)
    try {
      setHits(await searchExternalBooks({ title: searchQuery || state.title, author: state.author, isbn: state.isbn }))
    } catch (err) {
      setError(friendlyError(err, 'No pude buscar libros ahora.'))
    } finally {
      setSearching(false)
    }
  }

  async function onSearchCovers() {
    if (!state.title.trim() && !state.author.trim() && !state.isbn.trim()) {
      setCoverStatus('Completá título o autor para buscar una portada.')
      return
    }
    setSearching(true)
    setCoverStatus('Buscando portadas…')
    setError(null)
    try {
      const found = await searchCoverCandidates({ title: state.title, author: state.author, isbn: state.isbn })
      setCovers(found)
      setCoverStatus(found.length ? `Elegí una de ${found.length} portadas.` : 'No encontré portadas para este título. Probá subir una imagen.')
    } catch (err) {
      setCoverStatus(null)
      setError(friendlyError(err, 'No pude buscar portadas ahora.'))
    } finally {
      setSearching(false)
    }
  }

  function applyHit(hit: ExternalBookHit) {
    setState((current) => {
      const suggested = mapSubjectsToCategories(hit.subjects ?? [])
      return {
        ...current,
        title: hit.title,
        author: hit.author || current.author,
        isbn: hit.isbn || current.isbn,
        pageCount: hit.pageCount ? String(hit.pageCount) : current.pageCount,
        publisher: hit.publisher || current.publisher,
        published: hit.published || current.published,
        coverUrl: hit.coverUrl || current.coverUrl,
        categories: current.categories.length || !suggested.length ? current.categories : suggested,
      }
    })
    if (hit.coverUrl) {
      setCoverFile(null)
      setRemoveCover(false)
    }
  }

  function buildBook(): Book {
    const title = state.title.trim()
    const author = state.author.trim()
    return {
      id: book?.id ?? createBookId(),
      slug: book?.slug ?? createSlug(title, author, books),
      userId: book?.userId,
      title,
      author,
      coverUrl: removeCover ? null : emptyToNull(state.coverUrl),
      coverPath: removeCover ? null : book?.coverPath ?? null,
      ownership: state.ownership,
      readingStatus: isWishlist ? null : state.readingStatus,
      priority: state.priority,
      categories: state.categories,
      format: isWishlist ? null : state.format,
      isbn: emptyToNull(state.isbn),
      pageCount: clampPageCount(state.pageCount.trim() === '' ? null : Number(state.pageCount.replace(',', '.'))),
      publisher: emptyToNull(state.publisher),
      published: emptyToNull(state.published),
      progress: isWishlist || state.readingStatus === 'pending'
        ? null
        : state.readingStatus === 'read'
          ? 100
          : clampProgress(state.progress.trim() === '' ? null : Number(state.progress.replace(',', '.'))),
      rating: isRead && state.rating ? Number(state.rating) : null,
      whyRead: emptyToNull(state.whyRead),
      notes: emptyToNull(state.notes),
      learnings: isRead ? emptyToNull(state.learnings) : null,
      startedAt: isReading || isRead ? emptyToNull(state.startedAt) : null,
      finishedAt: isRead ? emptyToNull(state.finishedAt) || localIsoDate() : null,
      epubFileName: book?.epubFileName ?? null,
      epubPath: book?.epubPath ?? null,
      epubSizeBytes: book?.epubSizeBytes ?? null,
      pdfFileName: book?.pdfFileName ?? null,
      pdfPath: book?.pdfPath ?? null,
      pdfSizeBytes: book?.pdfSizeBytes ?? null,
      createdAt: book?.createdAt ?? new Date().toISOString(),
    }
  }

  async function persist(target?: Book) {
    setSaving(true)
    setError(null)
    try {
      const saved = await upsertBook(target ?? buildBook(), { coverFile: coverFile ?? undefined, removeCover })
      showToast(book || target ? 'Cambios guardados.' : 'Libro agregado a tu biblioteca.')
      navigate(hrefForBook(saved))
    } catch (err) {
      setError(friendlyError(err, 'No pude guardar el libro.'))
    } finally {
      setSaving(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!state.title.trim() || !state.author.trim()) {
      setError('Título y autor son obligatorios.')
      return
    }
    if (!book && !forceCreate && possibleDuplicate) {
      setDuplicate(possibleDuplicate)
      return
    }
    void persist()
  }

  return (
    <form className="book-form" onSubmit={onSubmit}>
      <div className="form-header">
        <div>
          <p className="eyebrow">{book ? 'Editar' : 'Nuevo libro'}</p>
          <h1>{book ? book.title : 'Agregar libro'}</h1>
        </div>
        {!book ? (
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/subir-epub')}>
            Subir EPUB o PDF
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`${hrefForBook(book)}/epub`)}>
            Archivos EPUB / PDF
          </button>
        )}
      </div>

      {!book ? (
        <div className="panel">
          <h2>Buscar libro</h2>
          <p className="muted">Título, autor o ISBN. Elegí un resultado para precargar el formulario.</p>
          <div className="toolbar">
            <label className="search-bar">
              <span className="sr-only">Buscar libro externo</span>
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Título / autor / ISBN" />
            </label>
            <button type="button" className="btn btn-ghost" onClick={() => void onSearchBooks()} disabled={searching}>
              {searching ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          {hits.length > 0 ? (
            <ul className="search-hits">
              {hits.map((hit, index) => (
                <li key={`${hit.source}-${hit.title}-${index}`}>
                  <button type="button" className="pick-item" onClick={() => applyHit(hit)}>
                    <BookCover title={hit.title} author={hit.author} coverUrl={hit.coverUrl} />
                    <div>
                      <strong>{hit.title}</strong>
                      <span>{hit.author}</span>
                      <span className="muted">{hit.source}{hit.isbn ? ` · ${hit.isbn}` : ''}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="form-layout">
        <aside className="form-cover-col">
          <BookCover title={state.title || 'Nuevo libro'} author={state.author || 'Autor'} coverUrl={removeCover ? null : state.coverUrl} />
          <label className="btn btn-ghost file-btn">
            Subir imagen
            <input type="file" accept="image/*" hidden onChange={(event) => void onLocalCover(event.target.files?.[0])} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={() => void onSearchCovers()} disabled={searching}>
            {searching ? 'Buscando…' : 'Buscar portada'}
          </button>
          {coverStatus ? <p className="muted cover-status">{coverStatus}</p> : null}
          {covers.length > 0 ? (
            <div className="cover-candidates">
              {covers.map((candidate) => (
                <button
                  key={candidate.url}
                  type="button"
                  className={`cover-option ${state.coverUrl === candidate.url ? 'is-active' : ''}`}
                  onClick={() => {
                    setCoverFile(null)
                    setRemoveCover(false)
                    update('coverUrl', candidate.url)
                  }}
                >
                  <img src={candidate.url} alt={candidate.label} />
                  <span>{candidate.source}</span>
                </button>
              ))}
            </div>
          ) : null}
          {state.coverUrl || book?.coverPath ? (
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={() => {
                setRemoveCover(true)
                setCoverFile(null)
                update('coverUrl', '')
              }}
            >
              Quitar portada
            </button>
          ) : null}
        </aside>

        <div className="form-fields">
          <div className="field-grid">
            <label className="field">
              <span>Título *</span>
              <input value={state.title} onChange={(event) => update('title', event.target.value)} required />
            </label>
            <label className="field">
              <span>Autor *</span>
              <input value={state.author} onChange={(event) => update('author', event.target.value)} required />
            </label>
          </div>

          <label className="field">
            <span>Portada URL</span>
            <input
              value={state.coverUrl.startsWith('blob:') || state.coverUrl.startsWith('data:') ? '' : state.coverUrl}
              onChange={(event) => {
                setCoverFile(null)
                setRemoveCover(false)
                update('coverUrl', event.target.value)
              }}
              placeholder="https://…"
            />
          </label>

          <fieldset className="choice-row">
            <legend>Posesión</legend>
            {OWNERSHIP_OPTIONS.map((value) => (
              <label key={value} className={`choice ${state.ownership === value ? 'is-active' : ''}`}>
                <input type="radio" name="ownership" checked={state.ownership === value} onChange={() => update('ownership', value)} />
                {ownershipLabel[value]}
              </label>
            ))}
          </fieldset>

          {!isWishlist ? (
            <fieldset className="choice-row">
              <legend>Estado</legend>
              {STATUS_OPTIONS.map((value) => (
                <label key={value} className={`choice ${state.readingStatus === value ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="readingStatus"
                    checked={state.readingStatus === value}
                    onChange={() => {
                      update('readingStatus', value)
                      if (value === 'pending') update('progress', '')
                      if (value === 'read') update('progress', '100')
                    }}
                  />
                  {statusLabel[value]}
                </label>
              ))}
            </fieldset>
          ) : null}

          {isReading ? (
            <label className="field">
              <span>{clampPageCount(Number(state.pageCount)) ? 'Avance (página)' : 'Avance (%)'}</span>
              <input
                type="number"
                min={0}
                max={clampPageCount(Number(state.pageCount)) ?? 100}
                inputMode="numeric"
                placeholder="Opcional"
                value={
                  clampPageCount(Number(state.pageCount)) && state.progress
                    ? String(Math.round((Number(state.progress) / 100) * Number(state.pageCount)))
                    : state.progress
                }
                onChange={(event) => {
                  const pages = clampPageCount(Number(state.pageCount))
                  const raw = event.target.value
                  if (!pages) {
                    update('progress', raw)
                    return
                  }
                  if (raw.trim() === '') {
                    update('progress', '')
                    return
                  }
                  const next = progressFromPage(Number(raw.replace(',', '.')), pages)
                  update('progress', next == null ? '' : String(next))
                }}
              />
              <p className="field-hint">
                {clampPageCount(Number(state.pageCount))
                  ? `Sobre ${state.pageCount} páginas. Si lo dejás vacío, queda Leyendo sin página.`
                  : 'Si lo dejás vacío, el libro queda en Leyendo sin porcentaje.'}
              </p>
            </label>
          ) : null}

          <fieldset className="choice-row">
            <legend>Prioridad</legend>
            {PRIORITY_ORDER.map((value) => (
              <label key={value} className={`choice ${state.priority === value ? 'is-active' : ''}`}>
                <input type="radio" name="priority" checked={state.priority === value} onChange={() => update('priority', value)} />
                {priorityLabel[value]}
              </label>
            ))}
          </fieldset>

          {!isWishlist ? (
            <fieldset className="choice-row">
              <legend>Formato</legend>
              {FORMAT_OPTIONS.map((value) => (
                <label key={value} className={`choice ${state.format === value ? 'is-active' : ''}`}>
                  <input type="radio" name="format" checked={state.format === value} onChange={() => update('format', value)} />
                  {formatLabel[value]}
                </label>
              ))}
            </fieldset>
          ) : null}

          <div className="field">
            <span>Categorías</span>
            <div className="tag-list">
              {CATEGORIES.map((category) => (
                <CategoryTag key={category} category={category} active={state.categories.includes(category)} onClick={() => toggleCategory(category)} />
              ))}
            </div>
            {!book ? (
              <p className="field-hint">Si elegís un resultado de la búsqueda, sugerimos categorías según Google Books y Open Library.</p>
            ) : null}
          </div>

          <label className="field">
            <span>ISBN</span>
            <input value={state.isbn} onChange={(event) => update('isbn', event.target.value)} placeholder="Opcional" />
            <p className="field-hint">Código único del libro (el de la tapa o el código de barras). Sirve para buscar la portada y evitar duplicados. No hace falta completarlo.</p>
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Páginas</span>
              <input
                type="number"
                min={1}
                max={20000}
                inputMode="numeric"
                placeholder="Opcional"
                value={state.pageCount}
                onChange={(event) => update('pageCount', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Año o fecha</span>
              <input value={state.published} onChange={(event) => update('published', event.target.value)} placeholder="2019" />
            </label>
          </div>

          <label className="field">
            <span>Editorial</span>
            <input value={state.publisher} onChange={(event) => update('publisher', event.target.value)} placeholder="Opcional" />
          </label>

          <label className="field">
            <span>¿Por qué quiero leerlo?</span>
            <textarea rows={3} value={state.whyRead} onChange={(event) => update('whyRead', event.target.value)} />
          </label>

          <label className="field">
            <span>Notas</span>
            <textarea rows={3} value={state.notes} onChange={(event) => update('notes', event.target.value)} />
          </label>

          {isReading || isRead ? (
            <label className="field">
              <span>Fecha de inicio</span>
              <input type="date" value={state.startedAt} onChange={(event) => update('startedAt', event.target.value)} />
            </label>
          ) : null}

          {isRead ? (
            <>
              <div className="field-grid">
                <div className="field">
                  <span>Puntuación</span>
                  <StarRating
                    value={state.rating ? Number(state.rating) : null}
                    onChange={(rating) => update('rating', rating == null ? '' : String(rating))}
                  />
                  <p className="field-hint">Tocá una estrella para puntuar. De nuevo la misma para quitarla.</p>
                </div>
                <label className="field">
                  <span>Fecha de finalización</span>
                  <input type="date" value={state.finishedAt} onChange={(event) => update('finishedAt', event.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Qué aprendí</span>
                <textarea rows={3} value={state.learnings} onChange={(event) => update('learnings', event.target.value)} />
              </label>
            </>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => history.back()}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {duplicate ? (
        <DuplicateDialog
          book={duplicate}
          wishlist={duplicate.ownership === 'wishlist'}
          onCancel={() => setDuplicate(null)}
          onUpdate={() => {
            const next = { ...buildBook(), id: duplicate.id, slug: duplicate.slug, createdAt: duplicate.createdAt }
            setDuplicate(null)
            void persist(next)
          }}
          onConvert={() => {
            const built = buildBook()
            const next: Book = {
              ...duplicate,
              ...built,
              id: duplicate.id,
              slug: duplicate.slug,
              ownership: 'owned',
              readingStatus: built.readingStatus ?? 'pending',
              format: duplicate.format === 'physical' ? 'both' : state.format,
              whyRead: duplicate.whyRead ?? emptyToNull(state.whyRead),
              notes: duplicate.notes ?? emptyToNull(state.notes),
              priority: duplicate.priority ?? state.priority,
              categories: duplicate.categories.length ? duplicate.categories : state.categories,
            }
            setDuplicate(null)
            void persist(next)
          }}
          onCreateAnyway={() => {
            setForceCreate(true)
            setDuplicate(null)
            void persist()
          }}
        />
      ) : null}
    </form>
  )
}
