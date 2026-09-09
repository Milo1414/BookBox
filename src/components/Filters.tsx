import { CATEGORIES } from '../constants'
import type { LibraryFilters, Priority } from '../types'
import { priorityLabel, statusLabel } from '../lib/labels'

interface FiltersProps {
  filters: LibraryFilters
  onChange: (next: LibraryFilters) => void
  showReading?: boolean
}

export function Filters({ filters, onChange, showReading = true }: FiltersProps) {
  return (
    <div className="filters">
      {showReading ? (
        <div className="chip-row" role="tablist" aria-label="Estado de lectura">
          {(
            [
              ['all', 'Todos'],
              ['pending', statusLabel.pending],
              ['reading', statusLabel.reading],
              ['read', statusLabel.read],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip ${filters.reading === value ? 'is-active' : ''}`}
              onClick={() => onChange({ ...filters, reading: value })}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="filter-selects">
        <label>
          <span>Prioridad</span>
          <select
            value={filters.priority}
            onChange={(event) => onChange({ ...filters, priority: event.target.value as Priority | 'all' })}
          >
            <option value="all">Todas</option>
            <option value="now">{priorityLabel.now}</option>
            <option value="high">{priorityLabel.high}</option>
            <option value="medium">{priorityLabel.medium}</option>
            <option value="low">{priorityLabel.low}</option>
          </select>
        </label>
        <label>
          <span>Categoría</span>
          <select
            value={filters.category}
            onChange={(event) => onChange({ ...filters, category: event.target.value })}
          >
            <option value="all">Todas</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Orden</span>
          <select
            value={filters.sort}
            onChange={(event) => onChange({ ...filters, sort: event.target.value as LibraryFilters['sort'] })}
          >
            <option value="priority">Prioridad</option>
            <option value="title">Título A-Z</option>
            <option value="author">Autor</option>
            <option value="createdAt">Fecha de agregado</option>
          </select>
        </label>
      </div>
    </div>
  )
}
