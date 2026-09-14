import { useState, type DragEvent } from 'react'
import { CATEGORIES, FORMAT_OPTIONS, PRIORITY_ORDER, STATUS_OPTIONS } from '../constants'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { clampPageCount, createBookId, createSlug, findDuplicate } from '../lib/books'
import { formatBytes, friendlyError } from '../lib/errors'
import { formatLabel, priorityLabel, statusLabel } from '../lib/labels'
import { hrefForBook, navigate } from '../lib/routing'
import { isEpubFile, parseEpub } from '../services/epub'
import { isPdfFile, titleFromPdfName, validatePdf } from '../services/pdf'
import { lookupBookFacts, lookupSuggestedCategories, searchCoverCandidates } from '../services/search'
import type { Book, CoverCandidate, Format, Priority, ReadingStatus } from '../types'
import { BookCover } from './BookCover'
import { DuplicateDialog } from './DuplicateDialog'

export function EpubImport({ replaceBook }: { replaceBook?: Book }) {
  const { configured } = useAuth()
  const { books, upsertBook, attachBookFiles, showToast } = useLibrary()
  const [epubDrag, setEpubDrag] = useState(false)
  const [pdfDrag, setPdfDrag] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [epubFile, setEpubFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
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
  const [categoryHint, setCategoryHint] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState(replaceBook?.coverUrl ?? '')
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null)
  const [candidates, setCandidates] = useState<CoverCandidate[]>([])
  const [duplicate, setDuplicate] = useState<Book | null>(null)
  const [forceCreate, setForceCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleDropped(list: FileList | File[] | null) {
    if (!list || list.length === 0) return
    const files = [...list]
    const epub = files.find((file) => isEpubFile(file) && !isPdfFile(file))
    const pdf = files.find(isPdfFile)
    if (!epub && !pdf) {
      setError('Solo se aceptan archivos EPUB o PDF.')
      return
    }
    if (pdf) takePdf(pdf, Boolean(epub))
    if (epub) void takeEpub(epub)
  }

  async function applySuggestedCategories(query: { title?: string; author?: string; isbn?: string; subjects?: string[] }) {
    if (replaceBook?.categories.length) return
    try {
      const suggested = await lookupSuggestedCategories(query)
      setCategories(suggested)
      setCategoryHint(
        suggested.length
          ? 'Sugeridas según el archivo, Google Books y Open Library. Podés ajustarlas.'
          : 'No encontré categorías automáticas. Elegilas a mano si querés.',
      )
    } catch {
      setCategoryHint('No pude sugerir categorías ahora. Elegilas a mano si querés.')
    }
  }

  function takePdf(next: File, skipCategories = false) {
    try {
      validatePdf(next)
      setError(null)
      setPdfFile(next)
      const nextTitle = !replaceBook && !title.trim() ? titleFromPdfName(next) : title
      if (nextTitle !== title) setTitle(nextTitle)
      if (!skipCategories && !replaceBook?.categories.length) {
        void applySuggestedCategories({ title: nextTitle, author, isbn })
      }
    } catch (err) {
      setError(friendlyError(err, 'No pude leer ese PDF.'))
    }
  }

  async function takeEpub(next: File) {
    setError(null)
    setCategoryHint(null)
    setStatus('Procesando metadata...')
    try {
      const parsed = await parseEpub(next)
      setEpubFile(next)
      setTitle(parsed.title)
      setAuthor(parsed.author)
      setIsbn(parsed.isbn ?? '')
      if (parsed.pageCount) setPageCount(String(parsed.pageCount))
      if (parsed.publisher) setPublisher(parsed.publisher)
      if (parsed.published) setPublished(parsed.published)

      const query = { title: parsed.title, author: parsed.author, isbn: parsed.isbn ?? undefined }
      setStatus('Completando ficha...')
      const [facts, found] = await Promise.all([
        parsed.pageCount ? Promise.resolve(null) : lookupBookFacts(query),
        parsed.coverUrl ? Promise.resolve([] as CoverCandidate[]) : searchCoverCandidates(query),
        applySuggestedCategories({ ...query, subjects: parsed.subjects }),
      ])

      if (facts?.pageCount) setPageCount(String(facts.pageCount))
      if (facts?.publisher && !parsed.publisher) setPublisher(facts.publisher)
      if (facts?.published && !parsed.published) setPublished(facts.published)

      if (parsed.coverUrl) {
        setCoverUrl(parsed.coverUrl)
        setCoverBlob(parsed.coverBlob)
        setCandidates([])
      } else {
        setCandidates(found)
        if (!found.length) setCoverUrl('')
      }
      setStatus(null)
    } catch (err) {
      setEpubFile(null)
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
      epubFileName: epubFile?.name ?? base?.epubFileName ?? null,
      epubPath: base?.epubPath ?? null,
      epubSizeBytes: epubFile?.size ?? base?.epubSizeBytes ?? null,
      pdfFileName: pdfFile?.name ?? base?.pdfFileName ?? null,
      pdfPath: base?.pdfPath ?? null,
      pdfSizeBytes: pdfFile?.size ?? base?.pdfSizeBytes ?? null,
      createdAt: base?.createdAt ?? new Date().toISOString(),
      userId: base?.userId,
    }
  }

  async function save(base?: Book) {
    if (!epubFile && !pdfFile) return
    setSaving(true)
    setError(null)
    try {
      const draft = buildBook(base)
      const saved = await upsertBook(draft, { coverFile: coverBlob })
      await attachBookFiles(saved, { epub: epubFile, pdf: pdfFile }, null)
      const parts = [epubFile ? 'EPUB' : null, pdfFile ? 'PDF' : null].filter(Boolean)
      const filesLabel = parts.join(' y ')
      showToast(
        base?.ownership === 'wishlist'
          ? 'Marcado como adquirido.'
          : replaceBook
            ? `${filesLabel} guardado.`
            : 'Libro agregado.',
      )
      navigate(hrefForBook(saved))
    } catch (err) {
      setError(friendlyError(err, 'No pude guardar los archivos.'))
    } finally {
      setSaving(false)
    }
  }

  async function onConfirm() {
    if (!title.trim() || !author.trim()) {
      setError('Título y autor son obligatorios.')
      return
    }
    if (!epubFile && !pdfFile) {
      setError('Elegí un EPUB, un PDF o ambos.')
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

  const showForm = Boolean(epubFile || pdfFile || replaceBook)
  const saveLabel = saving
    ? 'Guardando…'
    : replaceBook
      ? epubFile && pdfFile
        ? 'Guardar archivos'
        : epubFile
          ? replaceBook.epubFileName
            ? 'Reemplazar EPUB'
            : 'Agregar EPUB'
          : pdfFile
            ? replaceBook.pdfFileName
              ? 'Reemplazar PDF'
              : 'Agregar PDF'
            : 'Guardar archivos'
      : 'Agregar a biblioteca'

  return (
    <div className="page epub-page">
      <header className="page-header">
        <p className="eyebrow">{replaceBook ? 'Archivos del libro' : 'Importar'}</p>
        <h1>{replaceBook ? `Archivos de ${replaceBook.title}` : 'Subir EPUB o PDF'}</h1>
        <p className="lede">Podés adjuntar EPUB, PDF o ambos. Sugerimos categorías según el libro. Nada se sube hasta que confirmes.</p>
        {!configured ? (
          <p className="muted">Supabase no está configurado: se guarda la metadata en local. Los archivos se suben cuando conectes Storage.</p>
        ) : null}
      </header>

      <div className="file-drop-grid">
        <FileDropSlot
          label="EPUB"
          hint={epubFile?.name ?? replaceBook?.epubFileName ?? 'Arrastrá el EPUB o seleccioná un archivo'}
          hasFile={Boolean(epubFile || replaceBook?.epubFileName)}
          dragging={epubDrag}
          accept=".epub,.pdf,application/epub+zip,application/pdf"
          multiple
          size={epubFile?.size ?? replaceBook?.epubSizeBytes}
          onDrag={setEpubDrag}
          onFiles={handleDropped}
        />
        <FileDropSlot
          label="PDF"
          hint={pdfFile?.name ?? replaceBook?.pdfFileName ?? 'Arrastrá el PDF o seleccioná un archivo'}
          hasFile={Boolean(pdfFile || replaceBook?.pdfFileName)}
          dragging={pdfDrag}
          accept=".epub,.pdf,application/epub+zip,application/pdf"
          multiple
          size={pdfFile?.size ?? replaceBook?.pdfSizeBytes}
          onDrag={setPdfDrag}
          onFiles={handleDropped}
        />
      </div>

      {status ? <p className="muted">{status}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {showForm ? (
        <section className="panel epub-preview">
          <BookCover title={title || 'Libro'} author={author || 'Autor'} coverUrl={coverUrl} className="cover-lg" />
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
            <ul className="file-summary">
              <li>
                EPUB:{' '}
                {epubFile
                  ? `${epubFile.name}${formatBytes(epubFile.size) ? ` · ${formatBytes(epubFile.size)}` : ''}`
                  : replaceBook?.epubFileName
                    ? `${replaceBook.epubFileName} (actual)`
                    : 'sin archivo'}
              </li>
              <li>
                PDF:{' '}
                {pdfFile
                  ? `${pdfFile.name}${formatBytes(pdfFile.size) ? ` · ${formatBytes(pdfFile.size)}` : ''}`
                  : replaceBook?.pdfFileName
                    ? `${replaceBook.pdfFileName} (actual)`
                    : 'sin archivo'}
              </li>
            </ul>
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
                    onClick={() => {
                      setCategories((current) => (current.includes(category) ? current.filter((item) => item !== category) : [...current, category]))
                      setCategoryHint(null)
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {categoryHint ? <p className="field-hint">{categoryHint}</p> : null}
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
              <button type="button" className="btn btn-primary" disabled={saving || (!epubFile && !pdfFile)} onClick={() => void onConfirm()}>
                {saveLabel}
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

function FileDropSlot({
  label,
  hint,
  hasFile,
  dragging,
  accept,
  size,
  multiple = false,
  onDrag,
  onFiles,
}: {
  label: string
  hint: string
  hasFile: boolean
  dragging: boolean
  accept: string
  size?: number | null
  multiple?: boolean
  onDrag: (value: boolean) => void
  onFiles: (files: FileList | File[] | null) => void
}) {
  function onDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    onDrag(true)
  }

  return (
    <label
      className={`dropzone ${dragging ? 'is-dragging' : ''} ${hasFile ? 'has-file' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={() => onDrag(false)}
      onDrop={(event) => {
        event.preventDefault()
        onDrag(false)
        onFiles(event.dataTransfer.files)
      }}
    >
      <strong>{label}</strong>
      <span>{hint}</span>
      {formatBytes(size) ? <span className="muted">{formatBytes(size)}</span> : null}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          onFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </label>
  )
}
