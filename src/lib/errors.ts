export function friendlyError(error: unknown, fallback = 'Algo salió mal. Probá de nuevo.'): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Sin conexión. Esta acción necesita internet.'
  }

  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()

  if (lower.includes('failed to fetch') || lower.includes('network')) return 'Sin conexión. Esta acción necesita internet.'
  if (lower.includes('jwt') || lower.includes('session') || lower.includes('expired') || lower.includes('not authenticated')) {
    return 'Tu sesión venció. Volvé a ingresar.'
  }
  if (lower.includes('duplicate') || lower.includes('unique')) return 'Este libro posiblemente ya existe.'
  if (lower.includes('row-level security') || lower.includes('rls') || lower.includes('permission') || lower.includes('not allowed')) {
    return 'No tenés permiso para hacer eso.'
  }
  if (lower.includes('bucket') || lower.includes('storage') || lower.includes('object')) return 'No pude guardar o leer el archivo.'
  if (lower.includes('payload') || lower.includes('too large') || lower.includes('maximum')) return 'El archivo es demasiado grande.'
  if (lower.includes('invalid') && lower.includes('epub')) return 'Ese archivo no parece un EPUB válido.'

  console.error(error)
  return fallback
}

export function formatBytes(bytes?: number | null): string | null {
  if (bytes == null || Number.isNaN(bytes)) return null
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}
