import { useEffect, useState } from 'react'
import { coverPalette } from '../lib/books'

interface BookCoverProps {
  title: string
  author: string
  coverUrl?: string | null
  className?: string
  showCaption?: boolean
}

export function BookCover({ title, author, coverUrl, className = '', showCaption = true }: BookCoverProps) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [coverUrl])
  const showImage = Boolean(coverUrl) && !failed
  const palette = coverPalette(title)

  return (
    <div className={`cover ${className}`}>
      {showImage ? (
        <img src={coverUrl ?? ''} alt={`Portada de ${title}`} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="cover-placeholder" style={{ background: `linear-gradient(160deg, ${palette.from}, ${palette.to})` }}>
          {showCaption ? (
            <>
              <span className="cover-placeholder-title">{title}</span>
              <span className="cover-placeholder-author">{author}</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
