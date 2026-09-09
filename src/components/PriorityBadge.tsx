import type { Priority } from '../types'
import { priorityChipLabel, priorityLabel } from '../lib/labels'

interface PriorityBadgeProps {
  priority?: Priority | null
  className?: string
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  if (!priority) return null
  return (
    <span className={`badge badge-priority badge-${priority} ${className}`}>
      <span className="badge-full">{priorityLabel[priority]}</span>
      <span className="badge-short">{priorityChipLabel[priority]}</span>
    </span>
  )
}
