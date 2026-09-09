import { COVER_BUCKET, FILE_BUCKET } from '../constants'
import { supabase } from '../lib/supabase'

function requireClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export function coverObjectPath(userId: string, bookId: string): string {
  return `${userId}/${bookId}/cover.webp`
}

export function epubObjectPath(userId: string, bookId: string): string {
  return `${userId}/${bookId}/libro.epub`
}

export async function uploadCover(userId: string, bookId: string, blob: Blob): Promise<{ path: string; url: string }> {
  const client = requireClient()
  const path = coverObjectPath(userId, bookId)
  const { error } = await client.storage.from(COVER_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/webp',
    cacheControl: '3600',
  })
  if (error) throw error
  const { data } = client.storage.from(COVER_BUCKET).getPublicUrl(path)
  return { path, url: `${data.publicUrl}?t=${Date.now()}` }
}

export async function uploadEpub(userId: string, bookId: string, file: File | Blob): Promise<{ path: string; size: number }> {
  const client = requireClient()
  const path = epubObjectPath(userId, bookId)
  const { error } = await client.storage.from(FILE_BUCKET).upload(path, file, {
    upsert: true,
    contentType: 'application/epub+zip',
    cacheControl: '0',
  })
  if (error) throw error
  return { path, size: file.size }
}

export async function signedEpubUrl(path: string, expiresIn = 60): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.storage.from(FILE_BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) throw error ?? new Error('No pude generar el enlace de descarga.')
  return data.signedUrl
}

export async function removeStorageObject(bucket: string, path?: string | null): Promise<void> {
  if (!path) return
  const client = requireClient()
  const { error } = await client.storage.from(bucket).remove([path])
  if (error) throw error
}

export async function removeBookFiles(coverPath?: string | null, epubPath?: string | null): Promise<void> {
  await Promise.all([removeStorageObject(COVER_BUCKET, coverPath), removeStorageObject(FILE_BUCKET, epubPath)])
}
