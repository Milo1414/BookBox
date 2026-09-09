import { useState } from 'react'
import { IconStar } from './Icons'

const STARS = [1, 2, 3, 4, 5] as const

interface StarRatingProps {
  value?: number | null
  onChange?: (value: number | null) => void
  size?: 'sm' | 'md'
}

function clampedRating(value?: number | null): number {
  if (value == null || Number.isNaN(value)) return 0
  return Math.min(5, Math.max(0, Math.round(value)))
}

export function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  const rating = clampedRating(value)
  const interactive = Boolean(onChange)
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? rating
  const summary = rating ? `${rating} de 5 estrellas` : 'Sin puntuar'

  return (
    <div
      className={`star-rating star-rating-${size}${interactive ? ' is-interactive' : ''}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Puntuación' : summary}
      onMouseLeave={interactive ? () => setHover(null) : undefined}
    >
      {STARS.map((star) => {
        const filled = star <= shown
        if (!interactive || !onChange) {
          return (
            <span key={star} className={`star ${filled ? 'is-filled' : ''}`} aria-hidden="true">
              <IconStar className="icon" />
            </span>
          )
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
            className={`star-btn ${filled ? 'is-filled' : ''}`}
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(null)}
            onClick={() => onChange(rating === star ? null : star)}
          >
            <IconStar className="icon" />
          </button>
        )
      })}
    </div>
  )
}
