import { useMemo, useRef, useState } from 'react'
import { LoginModal } from '../components/LoginModal'
import { ShelfRow } from '../components/ShelfRow'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { readingReport } from '../lib/books'
import { friendlyError } from '../lib/errors'
import { formatNumber, formatPages } from '../lib/labels'
import { navigate } from '../lib/routing'

export function Profile() {
  const { configured, isAdmin, user, signOut } = useAuth()
  const { books, exportLibrary, importLibraryJson, showToast } = useLibrary()
  const [loginOpen, setLoginOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const report = useMemo(() => readingReport(books), [books])
  const initial = user?.email?.[0]?.toUpperCase() ?? 'C'
  const monthLabel = new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date())
  const year = new Date().getFullYear()

  async function onImport(file?: File) {
    if (!file) return
    try {
      const payload = JSON.parse(await file.text()) as unknown
      const preview = Array.isArray((payload as { books?: unknown }).books)
        ? (payload as { books: unknown[] }).books
        : Array.isArray(payload)
          ? payload
          : []
      const ok = window.confirm(`El archivo tiene ${preview.length} libros. Se van a agregar solo los que no existan (merge). ¿Continuar?`)
      if (!ok) return
      const result = await importLibraryJson(payload)
      showToast(`Importados ${result.added}. Omitidos ${result.skipped}.`)
    } catch (error) {
      showToast(friendlyError(error, 'No pude importar ese JSON.'))
    }
  }

  async function onSignOut() {
    try {
      await signOut()
      showToast('Sesión cerrada.')
    } catch (error) {
      showToast(friendlyError(error))
    }
  }

  return (
    <div className="page profile-page">
      <header className="page-header profile-header">
        <span className="avatar-btn profile-avatar" aria-hidden="true">
          {initial}
        </span>
        <div>
          <p className="eyebrow">Perfil</p>
          <h1>{isAdmin ? user?.email ?? 'Administración' : 'La biblioteca'}</h1>
          <p className="lede">Lo leído este mes, este año y el resto de la estantería.</p>
        </div>
      </header>

      <section className="profile-stats" aria-label="Estadísticas de lectura">
        <Stat value={report.readMonth} label={`Leídos en ${monthLabel}`} hint={formatPages(report.pagesMonth) ?? 'Sin páginas cargadas'} />
        <Stat value={report.readYear} label={`Leídos en ${year}`} hint={formatPages(report.pagesYear) ?? 'Sin páginas cargadas'} />
        <Stat value={report.readTotal} label="Leídos en total" hint={formatPages(report.pagesTotal) ?? 'Sin páginas cargadas'} />
        <Stat value={report.streakMonths} label={report.streakMonths === 1 ? 'Mes seguido' : 'Meses seguidos'} hint="Racha con al menos un libro terminado" />
        <Stat value={report.reading} label="Leyendo ahora" />
        <Stat value={report.pending} label="Pendientes" />
        <Stat value={report.owned} label="En posesión" />
        <Stat value={report.wishlist} label="Deseados" />
      </section>

      {report.yearBooks.length > 0 ? (
        <ShelfRow title={`Terminados en ${year}`} books={report.yearBooks.slice(0, 8)} variant="browse" href="/biblioteca" />
      ) : (
        <p className="shelf-empty">Todavía no hay libros con fecha de finalización este año. Si ya los leíste, cargala en el libro.</p>
      )}

      {isAdmin ? (
        <section className="panel">
          <h2>Administración</h2>
          <div className="detail-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate('/agregar')}>
              Agregar libro
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/subir-epub')}>
              Subir EPUB
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => exportLibrary()}>
              Exportar biblioteca
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
              Importar biblioteca
            </button>
            {configured ? (
              <button type="button" className="btn btn-danger-ghost" onClick={() => void onSignOut()}>
                Cerrar sesión
              </button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => void onImport(event.target.files?.[0])} />
        </section>
      ) : (
        <section className="panel">
          <h2>Ingresar</h2>
          <p className="muted">Si administrás esta biblioteca, iniciá sesión para editarla.</p>
          <button type="button" className="btn btn-primary" onClick={() => setLoginOpen(true)}>
            Ingresar
          </button>
        </section>
      )}

      {loginOpen ? <LoginModal onClose={() => setLoginOpen(false)} /> : null}
    </div>
  )
}

function Stat({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return (
    <article className="profile-stat">
      <strong>{formatNumber(value)}</strong>
      <span>{label}</span>
      {hint ? <p>{hint}</p> : null}
    </article>
  )
}
