import type { Book } from '../types'
import { BookCard } from './BookCard'

interface BookGridProps {
  books: Book[]
  emptyTitle: string
  emptyText?: string
  variant?: 'grid' | 'shelf'
}

export function BookGrid({ books, emptyTitle, emptyText, variant = 'grid' }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-title">{emptyTitle}</p>
        {emptyText ? <p className="empty-text">{emptyText}</p> : null}
      </div>
    )
  }

  return (
    <div className={variant === 'shelf' ? 'book-grid book-shelf' : 'book-grid'}>
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}
