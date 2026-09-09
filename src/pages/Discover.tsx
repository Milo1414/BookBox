import { useMemo, useState } from 'react'
import { BookGrid } from '../components/BookGrid'
import { SearchBar } from '../components/SearchBar'
import { useLibrary } from '../context/LibraryContext'
import { applyFilters } from '../lib/books'
import type { LibraryFilters } from '../types'

function queryFromUrl(): string {
  return new URLSearchParams(window.location.search).get('q') ?? ''
}

export function Discover() {
  const { books } = useLibrary()
  const [query, setQuery] = useState(queryFromUrl)
  const filters: LibraryFilters = {
    query,
    reading: 'all',
    priority: 'all',
    category: 'all',
    sort: 'title',
  }
  const filtered = useMemo(() => applyFilters(books, filters), [books, query])

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Explorar</p>
        <h1>Descubrir</h1>
        <p className="lede">Buscá por título o autor en toda la estantería.</p>
      </header>
      <div className="toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar libros, autores..." />
      </div>
      <BookGrid
        books={filtered}
        emptyTitle={query ? 'No encontré libros con esa búsqueda.' : 'Todavía no hay libros para descubrir.'}
        emptyText={query ? 'Probá con otro título o autor.' : undefined}
      />
    </div>
  )
}
