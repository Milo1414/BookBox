import type { Ownership, ReadingStatus } from '../types'
import { ownershipLabel, statusLabel } from '../lib/labels'

interface StatusBadgeProps {
  status?: ReadingStatus | null
  ownership?: Ownership
  className?: string
}

export function StatusBadge({ status, ownership, className = '' }: StatusBadgeProps) {
  if (ownership) {
    return <span className={`badge badge-ownership badge-${ownership} ${className}`}>{ownershipLabel[ownership]}</span>
  }
  if (!status) return null
  return <span className={`badge badge-status badge-${status} ${className}`}>{statusLabel[status]}</span>
}
