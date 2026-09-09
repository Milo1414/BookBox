import type { Book } from '../types'
import { hrefForBook, navigate } from '../lib/routing'
import { BookCover } from './BookCover'
import { PriorityBadge } from './PriorityBadge'
import { StarRating } from './StarRating'
import { StatusBadge } from './StatusBadge'

interface BookCardProps {
  book: Book
}

export function BookCard({ book }: BookCardProps) {
  return (
    <a
      className="book-card"
      href={hrefForBook(book)}
      onClick={(event) => {
        event.preventDefault()
        navigate(hrefForBook(book))
      }}
    >
      <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} />
      <div className="book-card-meta">
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        {book.readingStatus === 'read' ? <StarRating value={book.rating} size="sm" /> : null}
        <div className="book-card-badges">
          <PriorityBadge priority={book.priority} />
          {book.ownership === 'wishlist' ? (
            <StatusBadge ownership="wishlist" />
          ) : (
            <StatusBadge status={book.readingStatus} />
          )}
        </div>
      </div>
    </a>
  )
}
