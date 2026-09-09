import type { Format, Ownership, Priority, ReadingStatus } from '../types'

export const ownershipLabel: Record<Ownership, string> = {
  owned: 'Lo tengo',
  wishlist: 'Deseado',
}

export const statusLabel: Record<ReadingStatus, string> = {
  pending: 'Pendiente',
  reading: 'Leyendo',
  read: 'Leído',
}

export const priorityLabel: Record<Priority, string> = {
  now: 'Quiero leer ya',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export const priorityChipLabel: Record<Priority, string> = {
  now: 'Ya',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export const formatLabel: Record<Format, string> = {
  epub: 'EPUB',
  physical: 'Físico',
  both: 'EPUB + Físico',
}

export function formatDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es').format(value)
}

export function formatPages(value?: number | null): string | null {
  if (value == null || value < 1) return null
  return `${formatNumber(value)} ${value === 1 ? 'página' : 'páginas'}`
}

export function formatPageProgress(current: number, total: number): string {
  return `${formatNumber(current)} / ${formatNumber(total)}`
}

export function formatPublished(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d{4}$/.test(trimmed)) return trimmed
  return formatDate(trimmed) ?? trimmed
}
