import { useMemo, useState } from 'react'
import { BookGrid } from '../components/BookGrid'
import { Filters } from '../components/Filters'
import { SearchBar } from '../components/SearchBar'
import { useLibrary } from '../context/LibraryContext'
import { applyFilters } from '../lib/books'
import type { LibraryFilters } from '../types'

const initialFilters: LibraryFilters = {
  query: '',
  reading: 'all',
  priority: 'all',
  category: 'all',
  sort: 'priority',
}

export function Wishlist() {
  const { books } = useLibrary()
  const [filters, setFilters] = useState<LibraryFilters>(initialFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtered = useMemo(() => applyFilters(books, filters, 'wishlist'), [books, filters])
  const hasActiveFilters = filters.query || filters.priority !== 'all' || filters.category !== 'all'

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Quiero conseguir</p>
        <h1>Deseados</h1>
        <p className="lede">{filtered.length} {filtered.length === 1 ? 'libro' : 'libros'} en la lista</p>
      </header>

      <div className="toolbar">
        <SearchBar value={filters.query} onChange={(query) => setFilters((current) => ({ ...current, query }))} />
        <button type="button" className="btn btn-ghost filters-toggle" onClick={() => setFiltersOpen((open) => !open)}>
          {filtersOpen ? 'Ocultar filtros' : 'Más filtros'}
        </button>
      </div>

      <div className={`filters-wrap ${filtersOpen ? 'is-open' : ''}`}>
        <Filters filters={filters} onChange={setFilters} showReading={false} />
      </div>

      <BookGrid
        books={filtered}
        emptyTitle={hasActiveFilters ? 'No encontré libros con estos filtros.' : 'Tu lista de deseados está vacía.'}
        emptyText={hasActiveFilters ? 'Prueba otra prioridad o categoría.' : 'Guarda aquí lo que quieres conseguir.'}
      />
    </div>
  )
}
