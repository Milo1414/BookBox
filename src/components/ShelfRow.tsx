import type { ReactNode } from 'react'
import { hrefForBook, navigate } from '../lib/routing'
import { currentPage, readingProgress } from '../lib/books'
import { formatPageProgress, priorityChipLabel } from '../lib/labels'
import type { Book } from '../types'
import { BookCover } from './BookCover'
import { IconChevron, IconFunnel, IconSearch } from './Icons'
import { StarRating } from './StarRating'

type ShelfFilter = 'all' | 'pending' | 'reading' | 'high'

interface ShelfRowProps {
  title: string
  href?: string
  books: Book[]
  variant?: 'next' | 'wish' | 'browse'
  query?: string
  onQuery?: (value: string) => void
  filter?: ShelfFilter
  onFilter?: (value: ShelfFilter) => void
  onOpen?: () => void
  extra?: ReactNode
  emptyText?: string
}

export function ShelfRow({ title, href, books, variant = 'browse', query, onQuery, filter, onFilter, onOpen, extra, emptyText }: ShelfRowProps) {
  return (
    <section className={`shelf-section shelf-${variant}`}>
      <div className="shelf-heading">
        {href || onOpen ? (
          <a
            className="shelf-title"
            href={href ?? '#'}
            onClick={(event) => {
              event.preventDefault()
              if (onOpen) onOpen()
              else if (href) navigate(href)
            }}
          >
            {title}
            <IconChevron className="icon" />
          </a>
        ) : (
          <h2 className="shelf-title">{title}</h2>
        )}
        {onQuery && onFilter ? (
          <div className="shelf-tools">
            <label className="shelf-search">
              <IconSearch className="icon" />
              <input
                type="search"
                value={query}
                placeholder="Buscar libros, autores..."
                onChange={(event) => onQuery(event.target.value)}
              />
            </label>
            <label className="shelf-filter">
              <IconFunnel className="icon" />
              <select value={filter} onChange={(event) => onFilter(event.target.value as ShelfFilter)}>
                <option value="all">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="reading">Leyendo</option>
                <option value="high">Alta</option>
              </select>
            </label>
          </div>
        ) : null}
        {extra}
        {href || onOpen ? (
          <a
            className={`shelf-all ${onQuery ? 'mobile-only-link' : ''}`}
            href={href ?? '#'}
            onClick={(event) => {
              event.preventDefault()
              if (onOpen) onOpen()
              else if (href) navigate(href)
            }}
          >
            Ver todos
          </a>
        ) : null}
      </div>

      {books.length === 0 ? (
        <p className="shelf-empty">{emptyText ?? 'Todavía no hay libros en esta estantería.'}</p>
      ) : (
        <div className="shelf-grid">
          {books.map((book) => (
            <ShelfCard key={book.id} book={book} variant={variant} />
          ))}
        </div>
      )}
    </section>
  )
}

function ShelfCard({ book, variant }: { book: Book; variant: 'next' | 'wish' | 'browse' }) {
  const reading = book.readingStatus === 'reading'
  const read = book.readingStatus === 'read'
  const progress = readingProgress(book)
  const page = currentPage(book)
  const pageMark = page != null && book.pageCount ? formatPageProgress(page, book.pageCount) : null
  const priority = book.priority === 'high' || book.priority === 'now' ? book.priority : null
  const wished = variant === 'wish' || book.ownership === 'wishlist'

  return (
    <a
      className="shelf-card"
      href={hrefForBook(book)}
      onClick={(event) => {
        event.preventDefault()
        navigate(hrefForBook(book))
      }}
    >
      <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} showCaption={false} />
      <h3>{book.title}</h3>
      <p>{book.author}</p>
      {read ? <StarRating value={book.rating} size="sm" /> : null}
      <div className="shelf-chips">
        {wished ? <span className="shelf-chip deseado">Deseado</span> : null}
        {!wished && reading ? (
          <>
            <span className="shelf-chip leyendo">Leyendo</span>
            {pageMark ? <span className="shelf-percent">{pageMark}</span> : progress != null ? <span className="shelf-percent">{progress}%</span> : null}
          </>
        ) : null}
        {!wished && !reading && !read ? <span className="shelf-chip pendiente">Pendiente</span> : null}
        {priority ? (
          <span className={`shelf-chip ${priority === 'now' ? 'ya' : 'alta'}`}>{priorityChipLabel[priority]}</span>
        ) : null}
      </div>
    </a>
  )
}
