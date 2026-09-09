import { useMemo, useState } from 'react'
import { ReadingHero } from '../components/ReadingHero'
import { ShelfRow } from '../components/ShelfRow'
import { useLibrary } from '../context/LibraryContext'
import { homeNextReads, homeWishlist, normalizeText } from '../lib/books'

type ShelfFilter = 'all' | 'pending' | 'reading' | 'high'

export function Home() {
  const { books } = useLibrary()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ShelfFilter>('all')

  const upcoming = useMemo(() => {
    const q = normalizeText(query)
    return homeNextReads(books, 8).filter((book) => {
      if (q && !normalizeText(`${book.title} ${book.author}`).includes(q)) return false
      if (filter === 'pending') return book.readingStatus === 'pending'
      if (filter === 'reading') return book.readingStatus === 'reading'
      if (filter === 'high') return book.priority === 'high' || book.priority === 'now'
      return true
    })
  }, [books, query, filter])

  const wished = useMemo(() => homeWishlist(books, 8), [books])

  return (
    <div className="page home-page">
      <ReadingHero books={books} />
      <ShelfRow
        title="Próximas lecturas"
        href="/biblioteca"
        books={upcoming}
        variant="next"
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
      />
      <ShelfRow title="Deseados" href="/deseados" books={wished} variant="wish" />
    </div>
  )
}
