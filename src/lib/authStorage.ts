const COOKIE_MAX_AGE = 60 * 60 * 24 * 400
const COOKIE_CHUNK_SIZE = 1800
const MAX_CHUNKS = 8

function cookieFlags(): string {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  return `; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const cookie of cookies) {
    const eq = cookie.indexOf('=')
    if (eq === -1) continue
    if (cookie.slice(0, eq) === name) {
      try {
        return decodeURIComponent(cookie.slice(eq + 1))
      } catch {
        return cookie.slice(eq + 1)
      }
    }
  }
  return null
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}${cookieFlags()}`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

function readChunkedCookie(key: string): string | null {
  const firstChunk = readCookie(`${key}.0`)
  if (firstChunk != null) {
    const parts = [firstChunk]
    for (let index = 1; index < MAX_CHUNKS; index += 1) {
      const chunk = readCookie(`${key}.${index}`)
      if (chunk == null) break
      parts.push(chunk)
    }
    return parts.join('')
  }
  return readCookie(key)
}

function writeChunkedCookie(key: string, value: string) {
  deleteChunkedCookie(key)
  if (value.length <= COOKIE_CHUNK_SIZE) {
    writeCookie(key, value)
    return
  }
  let index = 0
  for (let offset = 0; offset < value.length && index < MAX_CHUNKS; offset += COOKIE_CHUNK_SIZE) {
    writeCookie(`${key}.${index}`, value.slice(offset, offset + COOKIE_CHUNK_SIZE))
    index += 1
  }
}

function deleteChunkedCookie(key: string) {
  deleteCookie(key)
  for (let index = 0; index < MAX_CHUNKS; index += 1) {
    deleteCookie(`${key}.${index}`)
  }
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Safari private mode and some PWAs can block localStorage.
  }
}

function deleteLocal(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function readLegacySupabaseSession(): string | null {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && /^sb-.*-auth-token$/.test(key)) {
        return localStorage.getItem(key)
      }
    }
  } catch {
    return null
  }
  return null
}

export const authStorage = {
  getItem(key: string) {
    const stored = readLocal(key) ?? readChunkedCookie(key)
    if (stored) return stored
    const legacy = readLegacySupabaseSession()
    if (legacy) {
      writeLocal(key, legacy)
      writeChunkedCookie(key, legacy)
      return legacy
    }
    return null
  },
  setItem(key: string, value: string) {
    writeLocal(key, value)
    writeChunkedCookie(key, value)
  },
  removeItem(key: string) {
    deleteLocal(key)
    deleteChunkedCookie(key)
    try {
      const stale: string[] = []
      for (let index = 0; index < localStorage.length; index += 1) {
        const storedKey = localStorage.key(index)
        if (storedKey && /^sb-.*-auth-token$/.test(storedKey)) stale.push(storedKey)
      }
      stale.forEach(deleteLocal)
    } catch {
      // ignore
    }
  },
}
