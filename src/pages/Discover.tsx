import { useMemo, useState } from 'react'
import { BookGrid } from '../components/BookGrid'
import { SearchBar } from '../components/SearchBar'
import { ShelfRow } from '../components/ShelfRow'
import { useLibrary } from '../context/LibraryContext'
import { applyFilters, booksForShelf, discoverShelves, normalizeText } from '../lib/books'
import type { LibraryFilters } from '../types'

function queryFromUrl(): string {
  return new URLSearchParams(window.location.search).get('q') ?? ''
}

export function Discover() {
  const { books } = useLibrary()
  const [query, setQuery] = useState(queryFromUrl)
  const [shelfId, setShelfId] = useState<string | null>(null)

  const filters: LibraryFilters = {
    query,
    reading: 'all',
    priority: 'all',
    category: 'all',
    sort: 'title',
  }
  const searched = useMemo(() => applyFilters(books, filters), [books, query])
  const shelves = useMemo(() => discoverShelves(books), [books])
  const openShelf = shelves.find((shelf) => shelf.id === shelfId) ?? null
  const shelfBooks = useMemo(() => (shelfId ? booksForShelf(books, shelfId) : []), [books, shelfId])

  if (query.trim()) {
    return (
      <div className="page">
        <header className="page-header">
          <p className="eyebrow">Explorar</p>
          <h1>Descubrir</h1>
          <p className="lede">Resultados para “{query.trim()}”.</p>
        </header>
        <div className="toolbar">
          <SearchBar value={query} onChange={setQuery} placeholder="Buscar libros, autores..." />
        </div>
        <BookGrid
          books={searched}
          emptyTitle="No encontré libros con esa búsqueda."
          emptyText="Probá con otro título o autor."
        />
      </div>
    )
  }

  if (openShelf) {
    return (
      <div className="page">
        <header className="page-header">
          <button type="button" className="text-link" onClick={() => setShelfId(null)}>
            ← Estanterías
          </button>
          <p className="eyebrow">Explorar</p>
          <h1>{openShelf.title}</h1>
          <p className="lede">
            {openShelf.total} {openShelf.total === 1 ? 'libro' : 'libros'}
          </p>
        </header>
        <BookGrid books={shelfBooks} emptyTitle="No hay libros en esta estantería." />
      </div>
    )
  }

  const authors = shelves.filter((shelf) => shelf.id.startsWith('autor:'))
  const categories = shelves.filter((shelf) => shelf.id.startsWith('cat:'))
  const missing = shelves.find((shelf) => shelf.id === 'sin-portada')

  return (
    <div className="page discover-page">
      <header className="page-header">
        <p className="eyebrow">Explorar</p>
        <h1>Descubrir</h1>
        <p className="lede">Recorré la estantería por autor, categoría o los que todavía no tienen portada.</p>
      </header>
      <div className="toolbar">
        <SearchBar
          value={query}
          onChange={(value) => {
            setQuery(value)
            setShelfId(null)
          }}
          placeholder="Buscar libros, autores..."
        />
      </div>

      {authors.length > 0 ? (
        <div className="discover-group">
          {authors.map((shelf) => (
            <ShelfRow
              key={shelf.id}
              title={shelf.title}
              books={shelf.books}
              variant="browse"
              onOpen={() => setShelfId(shelf.id)}
            />
          ))}
        </div>
      ) : null}

      {categories.map((shelf) => (
        <ShelfRow
          key={shelf.id}
          title={shelf.title}
          books={shelf.books}
          variant="browse"
          onOpen={() => setShelfId(shelf.id)}
        />
      ))}

      {missing ? (
        <ShelfRow title={missing.title} books={missing.books} variant="browse" onOpen={() => setShelfId(missing.id)} />
      ) : null}

      {shelves.length === 0 && !normalizeText(query) ? (
        <p className="shelf-empty">Todavía no hay libros para descubrir.</p>
      ) : null}
    </div>
  )
}
