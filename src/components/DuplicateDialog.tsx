import type { Book } from '../types'

interface DuplicateDialogProps {
  book: Book
  wishlist?: boolean
  onUpdate: () => void
  onCreateAnyway: () => void
  onConvert?: () => void
  onCancel: () => void
}

export function DuplicateDialog({ book, wishlist, onUpdate, onCreateAnyway, onConvert, onCancel }: DuplicateDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dup-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="dup-title">{wishlist ? 'Este libro ya está en tu lista de deseados.' : 'Este libro posiblemente ya existe'}</h2>
        <p className="muted">
          {book.title} — {book.author}
        </p>
        <div className="dialog-actions wrap">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          {wishlist && onConvert ? (
            <button type="button" className="btn btn-primary" onClick={onConvert}>
              Marcar como adquirido
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={onUpdate}>
              Actualizar existente
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onCreateAnyway}>
            Crear igualmente
          </button>
        </div>
      </div>
    </div>
  )
}
