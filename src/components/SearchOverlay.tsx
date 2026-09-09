import { useMemo, useState, type FormEvent } from 'react'
import { useLibrary } from '../context/LibraryContext'
import { applyFilters } from '../lib/books'
import { hrefForBook, navigate } from '../lib/routing'
import type { LibraryFilters } from '../types'
import { BookCover } from './BookCover'
import { IconSearch } from './Icons'
import { StarRating } from './StarRating'

const emptyFilters: LibraryFilters = {
  query: '',
  reading: 'all',
  priority: 'all',
  category: 'all',
  sort: 'title',
}

interface SearchOverlayProps {
  onClose: () => void
}

export function SearchOverlay({ onClose }: SearchOverlayProps) {
  const { books } = useLibrary()
  const [query, setQuery] = useState('')
  const hits = useMemo(
    () => applyFilters(books, { ...emptyFilters, query }).slice(0, 8),
    [books, query],
  )

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    onClose()
    navigate(`/descubrir?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="dialog-backdrop search-overlay" role="presentation" onClick={onClose}>
      <div className="search-panel" role="dialog" aria-modal="true" aria-label="Buscar" onClick={(event) => event.stopPropagation()}>
        <form className="search-panel-bar" onSubmit={onSubmit}>
          <IconSearch className="icon" />
          <input
            autoFocus
            type="search"
            value={query}
            placeholder="Buscar libros, autores..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="text-link search-cancel" onClick={onClose}>
            Cerrar
          </button>
        </form>
        <ul className="search-hits">
          {query.trim() && hits.length === 0 ? <li className="muted">No encontré coincidencias.</li> : null}
          {hits.map((book) => (
            <li key={book.id}>
              <button
                type="button"
                className="search-hit"
                onClick={() => {
                  onClose()
                  navigate(hrefForBook(book))
                }}
              >
                <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} />
                <span>
                  <strong>{book.title}</strong>
                  <em>{book.author}</em>
                  {book.readingStatus === 'read' ? <StarRating value={book.rating} size="sm" /> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
