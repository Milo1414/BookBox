import { MAX_FILE_BYTES } from '../constants'

export function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return name.endsWith('.pdf') || type === 'application/pdf'
}

export function validatePdf(file: File): void {
  if (file.size > MAX_FILE_BYTES) throw new Error('El archivo es demasiado grande.')
  if (!isPdfFile(file)) throw new Error('Ese archivo no parece un PDF válido.')
}

export function titleFromPdfName(file: File): string {
  return file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
}
