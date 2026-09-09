import { useState } from 'react'
import { CATEGORIES, FORMAT_OPTIONS, PRIORITY_ORDER, STATUS_OPTIONS } from '../constants'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { clampPageCount, createBookId, createSlug, findDuplicate } from '../lib/books'
import { friendlyError } from '../lib/errors'
import { formatLabel, priorityLabel, statusLabel } from '../lib/labels'
import { hrefForBook, navigate } from '../lib/routing'
import { parseEpub } from '../services/epub'
import { lookupBookFacts, searchCoverCandidates } from '../services/search'
import type { Book, CoverCandidate, Format, Priority, ReadingStatus } from '../types'
import { BookCover } from './BookCover'
import { DuplicateDialog } from './DuplicateDialog'

export function EpubImport({ replaceBook }: { replaceBook?: Book }) {
  const { configured } = useAuth()
  const { books, upsertBook, attachEpub, showToast } = useLibrary()
  const [drag, setDrag] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState(replaceBook?.title ?? '')
  const [author, setAuthor] = useState(replaceBook?.author ?? '')
  const [isbn, setIsbn] = useState(replaceBook?.isbn ?? '')
  const [pageCount, setPageCount] = useState(replaceBook?.pageCount != null ? String(replaceBook.pageCount) : '')
  const [publisher, setPublisher] = useState(replaceBook?.publisher ?? '')
  const [published, setPublished] = useState(replaceBook?.published ?? '')
  const [priority, setPriority] = useState<Priority>(replaceBook?.priority ?? 'medium')
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>(replaceBook?.readingStatus ?? 'pending')
  const [format, setFormat] = useState<Format>(replaceBook?.format === 'physical' ? 'both' : replaceBook?.format ?? 'epub')
  const [categories, setCategories] = useState<string[]>(replaceBook?.categories ?? [])
  const [coverUrl, setCoverUrl] = useState(replaceBook?.coverUrl ?? '')
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null)
  const [candidates, setCandidates] = useState<CoverCandidate[]>([])
  const [duplicate, setDuplicate] = useState<Book | null>(null)
  const [forceCreate, setForceCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleFile(next: File) {
    setError(null)
    setStatus('Procesando metadata...')
    try {
      const parsed = await parseEpub(next)
      setFile(next)
      setTitle(parsed.title)
      setAuthor(parsed.author)
      setIsbn(parsed.isbn ?? '')
      if (parsed.pageCount) setPageCount(String(parsed.pageCount))
      if (parsed.publisher) setPublisher(parsed.publisher)
      if (parsed.published) setPublished(parsed.published)
      if (!parsed.pageCount) {
        const facts = await lookupBookFacts({ title: parsed.title, author: parsed.author, isbn: parsed.isbn ?? undefined })
        if (facts.pageCount) setPageCount(String(facts.pageCount))
        if (facts.publisher && !parsed.publisher) setPublisher(facts.publisher)
        if (facts.published && !parsed.published) setPublished(facts.published)
      }
      if (parsed.coverUrl) {
        setCoverUrl(parsed.coverUrl)
        setCoverBlob(parsed.coverBlob)
        setCandidates([])
      } else {
        setStatus('Buscando portada...')
        const found = await searchCoverCandidates({ title: parsed.title, author: parsed.author, isbn: parsed.isbn ?? undefined })
        setCandidates(found)
        if (!found.length) setCoverUrl('')
      }
      setStatus(null)
    } catch (err) {
      setFile(null)
      setStatus(null)
      setError(friendlyError(err, 'No pude leer ese EPUB.'))
    }
  }

  async function searchCovers() {
    if (!title.trim() && !author.trim() && !isbn.trim()) {
      setError('Completá título o autor para buscar una portada.')
      return
    }
    setError(null)
    setStatus('Buscando portadas…')
    try {
      const found = await searchCoverCandidates({ title, author, isbn })
      setCandidates(found)
      setStatus(found.length ? `Elegí una de ${found.length} portadas.` : 'No encontré portadas. Podés seguir con la del EPUB o subir una después.')
    } catch (err) {
      setStatus(null)
      setError(friendlyError(err, 'No pude buscar portadas ahora.'))
    }
  }

  function buildBook(base?: Book): Book {
    return {
      id: base?.id ?? createBookId(),
      slug: base?.slug ?? createSlug(title, author, books),
      title: title.trim(),
      author: author.trim(),
      coverUrl: coverUrl || null,
      coverPath: base?.coverPath ?? null,
      ownership: 'owned',
      readingStatus,
      priority,
      categories,
      format,
      isbn: isbn || null,
      pageCount: clampPageCount(pageCount.trim() === '' ? null : Number(pageCount)) ?? base?.pageCount ?? null,
      publisher: (publisher.trim() || base?.publisher) ?? null,
      published: (published.trim() || base?.published) ?? null,
      rating: base?.rating ?? null,
      whyRead: base?.whyRead ?? null,
      notes: base?.notes ?? null,
      learnings: base?.learnings ?? null,
      progress: base?.progress ?? null,
      startedAt: base?.startedAt ?? null,
      finishedAt: base?.finishedAt ?? null,
      epubFileName: file?.name ?? base?.epubFileName ?? null,
      epubPath: base?.epubPath ?? null,
      epubSizeBytes: file?.size ?? base?.epubSizeBytes ?? null,
      createdAt: base?.createdAt ?? new Date().toISOString(),
      userId: base?.userId,
    }
  }

  async function save(base?: Book) {
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      const draft = buildBook(base)
      const saved = await upsertBook(draft, { coverFile: coverBlob })
      await attachEpub(saved, file, null)
      showToast(base?.ownership === 'wishlist' ? 'Marcado como adquirido.' : replaceBook ? 'EPUB reemplazado.' : 'Libro agregado.')
      navigate(hrefForBook(saved))
    } catch (err) {
      setError(friendlyError(err, 'No pude guardar el EPUB.'))
    } finally {
      setSaving(false)
    }
  }

  async function onConfirm() {
    if (!title.trim() || !author.trim()) {
      setError('Título y autor son obligatorios.')
      return
    }
    if (replaceBook) {
      await save(replaceBook)
      return
    }
    const existing = forceCreate ? undefined : findDuplicate(books, title, author, isbn)
    if (existing) {
      setDuplicate(existing)
      return
    }
    await save()
  }

  return (
    <div className="page epub-page">
      <header className="page-header">
        <p className="eyebrow">{replaceBook ? 'Reemplazar archivo' : 'Importar'}</p>
        <h1>{replaceBook ? `EPUB de ${replaceBook.title}` : 'Subir EPUB'}</h1>
        <p className="lede">Analizamos el archivo en tu navegador. Nada se sube hasta que confirmes.</p>
        {!configured ? (
          <p className="muted">Supabase no está configurado: se guarda la metadata en local. El archivo EPUB se sube cuando conectes Storage.</p>
        ) : null}
      </header>

      <label
        className={`dropzone ${drag ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDrag(false)
          const dropped = event.dataTransfer.files[0]
          if (dropped) void handleFile(dropped)
        }}
      >
        <strong>Arrastrá tu EPUB aquí</strong>
        <span>o seleccioná un archivo</span>
        <input type="file" accept=".epub,application/epub+zip" hidden onChange={(event) => event.target.files?.[0] && void handleFile(event.target.files[0])} />
      </label>

      {status ? <p className="muted">{status}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {file ? (
        <section className="panel epub-preview">
          <BookCover title={title || 'EPUB'} author={author || 'Autor'} coverUrl={coverUrl} className="cover-lg" />
          <div className="form-fields">
            <label className="field">
              <span>Título</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="field">
              <span>Autor</span>
              <input value={author} onChange={(event) => setAuthor(event.target.value)} />
            </label>
            <label className="field">
              <span>ISBN</span>
              <input value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="Opcional" />
              <p className="field-hint">Código único del libro. Es opcional.</p>
            </label>
            <label className="field">
              <span>Páginas</span>
              <input type="number" min={1} max={20000} inputMode="numeric" value={pageCount} onChange={(event) => setPageCount(event.target.value)} placeholder="Opcional" />
            </label>
            <p className="muted">Archivo: {file.name} · Formato EPUB</p>
            <fieldset className="choice-row">
              <legend>Prioridad</legend>
              {PRIORITY_ORDER.map((value) => (
                <label key={value} className={`choice ${priority === value ? 'is-active' : ''}`}>
                  <input type="radio" name="epub-priority" checked={priority === value} onChange={() => setPriority(value)} />
                  {priorityLabel[value]}
                </label>
              ))}
            </fieldset>
            <fieldset className="choice-row">
              <legend>Estado</legend>
              {STATUS_OPTIONS.map((value) => (
                <label key={value} className={`choice ${readingStatus === value ? 'is-active' : ''}`}>
                  <input type="radio" name="epub-status" checked={readingStatus === value} onChange={() => setReadingStatus(value)} />
                  {statusLabel[value]}
                </label>
              ))}
            </fieldset>
            <fieldset className="choice-row">
              <legend>Formato</legend>
              {FORMAT_OPTIONS.map((value) => (
                <label key={value} className={`choice ${format === value ? 'is-active' : ''}`}>
                  <input type="radio" name="epub-format" checked={format === value} onChange={() => setFormat(value)} />
                  {formatLabel[value]}
                </label>
              ))}
            </fieldset>
            <div className="field">
              <span>Categorías</span>
              <div className="tag-list">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`tag ${categories.includes(category) ? 'is-active' : ''}`}
                    onClick={() => setCategories((current) => (current.includes(category) ? current.filter((item) => item !== category) : [...current, category]))}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => void searchCovers()}>
              Buscar portada
            </button>
            {candidates.length > 0 ? (
              <div className="cover-candidates">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.url}
                    type="button"
                    className={`cover-option ${coverUrl === candidate.url ? 'is-active' : ''}`}
                    onClick={() => {
                      setCoverUrl(candidate.url)
                      setCoverBlob(null)
                    }}
                  >
                    <img src={candidate.url} alt={candidate.label} />
                    <span>{candidate.source}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => navigate(replaceBook ? hrefForBook(replaceBook) : '/')}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void onConfirm()}>
                {saving ? 'Guardando…' : replaceBook ? 'Reemplazar EPUB' : 'Agregar a biblioteca'}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {duplicate ? (
        <DuplicateDialog
          book={duplicate}
          wishlist={duplicate.ownership === 'wishlist'}
          onCancel={() => setDuplicate(null)}
          onUpdate={() => {
            setDuplicate(null)
            void save(duplicate)
          }}
          onConvert={() => {
            const converted = {
              ...duplicate,
              ownership: 'owned' as const,
              readingStatus: 'pending' as const,
              format: duplicate.format === 'physical' ? ('both' as const) : ('epub' as const),
              priority: duplicate.priority ?? priority,
            }
            setDuplicate(null)
            void save(converted)
          }}
          onCreateAnyway={() => {
            setForceCreate(true)
            setDuplicate(null)
            void save()
          }}
        />
      ) : null}
    </div>
  )
}
