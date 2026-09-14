import type { Format, Ownership, Priority, ReadingStatus } from './types'

export const CATEGORIES = [
  'Software',
  'Arquitectura',
  'Datos',
  'Producto',
  'UX',
  'Diseño',
  'Liderazgo',
  'Management',
  'Negocios',
  'Emprendimiento',
  'Startups',
  'Estrategia',
  'Marketing',
  'Ventas',
  'Negociación',
  'Productividad',
  'Carrera',
  'Relaciones sociales',
  'Comunicación',
  'Psicología',
  'Toma de decisiones',
  'Trading',
  'Inversión',
  'Filosofía',
  'Creatividad',
  'Desarrollo personal',
  'Biografía',
] as const

export const PRIORITY_ORDER: Priority[] = ['now', 'high', 'medium', 'low']

export const OWNERSHIP_OPTIONS: Ownership[] = ['owned', 'wishlist']
export const STATUS_OPTIONS: ReadingStatus[] = ['pending', 'reading', 'read']
export const FORMAT_OPTIONS: Format[] = ['epub', 'physical', 'both']

export const STORAGE_KEY = 'bookbox.library.v1'
export const MIGRATION_KEY = 'bookbox.migrated.v1'
export const CATALOG_CACHE_KEY = 'bookbox.catalog.cache'
export const AUTH_STORAGE_KEY = 'bookbox.auth'
export const MAX_FILE_BYTES = 80 * 1024 * 1024
export const MAX_EPUB_BYTES = MAX_FILE_BYTES
export const COVER_BUCKET = 'book-covers'
export const FILE_BUCKET = 'book-files'
