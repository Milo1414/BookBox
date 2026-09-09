import type { ReactNode } from 'react'
import { bookQuote, featuredReading, libraryStats, readingProgress } from '../lib/books'
import { hrefForBook, navigate } from '../lib/routing'
import type { Book } from '../types'
import { BookCover } from './BookCover'
import { IconBookmark, IconCheck, IconClock, IconDots, IconHeart, IconOwned, IconReading } from './Icons'

interface ReadingHeroProps {
  books: Book[]
}

export function ReadingHero({ books }: ReadingHeroProps) {
  const featured = featuredReading(books)
  const stats = libraryStats(books)
  const isReading = featured?.readingStatus === 'reading'
  const progress = isReading && featured ? readingProgress(featured) : null

  return (
    <>
      <article className="reading-hero">
        {featured ? (
          <>
            <button type="button" className="hero-more" aria-label="Ver libro" onClick={() => navigate(hrefForBook(featured))}>
              <IconDots className="icon" />
            </button>
            <a
              className="hero-cover-link"
              href={hrefForBook(featured)}
              onClick={(event) => {
                event.preventDefault()
                navigate(hrefForBook(featured))
              }}
            >
              <BookCover title={featured.title} author={featured.author} coverUrl={featured.coverUrl} className="hero-cover" showCaption={false} />
            </a>
            <div className="hero-copy">
              <p className="hero-kicker">{isReading ? 'Leyendo ahora' : 'Próxima lectura'}</p>
              <h1>{featured.title}</h1>
              <p className="hero-author">{featured.author}</p>
              {isReading && progress != null ? (
                <div className="hero-progress">
                  <span className="progress-track" aria-hidden="true">
                    <span className="progress-fill" style={{ width: `${progress}%` }} />
                  </span>
                  <span>{progress}%</span>
                </div>
              ) : null}
              <blockquote>“{bookQuote(featured)}”</blockquote>
            </div>
          </>
        ) : (
          <div className="hero-copy hero-empty">
            <p className="hero-kicker">Próxima lectura</p>
            <h1>Tu próxima historia empieza acá</h1>
            <p className="hero-author">Cuando marques un libro como leyendo, va a brillar en este rincón.</p>
          </div>
        )}

        <div className="hero-side">
          <div className="hero-stats">
            <StatCard icon={<IconOwned className="icon" />} value={stats.owned} label="En posesión" />
            <StatCard icon={<IconClock className="icon" />} value={stats.pending} label="Pendientes" />
            <StatCard icon={<IconReading className="icon" />} value={stats.reading} label="Leyendo" />
            <StatCard icon={<IconCheck className="icon" />} value={stats.read} label="Leídos" />
            <StatCard icon={<IconHeart className="icon heart" />} value={stats.wishlist} label="Deseados" />
          </div>
        </div>
      </article>

      <div className="mobile-stats" aria-label="Resumen">
        <StatCard icon={<IconOwned className="icon" />} value={stats.owned} label="En mi estantería" />
        <StatCard icon={<IconClock className="icon" />} value={stats.pending} label="Pendientes" />
        <StatCard icon={<IconBookmark className="icon" />} value={stats.read} label="Leídos" />
        <StatCard icon={<IconHeart className="icon heart" />} value={stats.wishlist} label="Deseados" />
      </div>
    </>
  )
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        {icon}
        <strong>{value}</strong>
      </div>
      <span>{label}</span>
    </div>
  )
}
