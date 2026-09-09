export type AppRoute =
  | { page: 'home' }
  | { page: 'library' }
  | { page: 'wishlist' }
  | { page: 'discover' }
  | { page: 'profile' }
  | { page: 'detail'; id: string }
  | { page: 'form'; id?: string }
  | { page: 'epub'; id?: string }
  | { page: 'notfound' }

export function parsePath(pathname: string): AppRoute {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { page: 'home' }
  if (path === '/biblioteca') return { page: 'library' }
  if (path === '/deseados') return { page: 'wishlist' }
  if (path === '/descubrir') return { page: 'discover' }
  if (path === '/perfil') return { page: 'profile' }
  if (path === '/agregar') return { page: 'form' }
  if (path === '/subir-epub') return { page: 'epub' }

  const replaceEpub = path.match(/^\/libro\/([^/]+)\/epub$/)
  if (replaceEpub) return { page: 'epub', id: decodeURIComponent(replaceEpub[1]) }

  const edit = path.match(/^\/libro\/([^/]+)\/editar$/)
  if (edit) return { page: 'form', id: decodeURIComponent(edit[1]) }

  const detail = path.match(/^\/libro\/([^/]+)$/)
  if (detail) return { page: 'detail', id: decodeURIComponent(detail[1]) }

  return { page: 'notfound' }
}

export function navigate(path: string): void {
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function hrefForBook(book: { id: string; slug?: string } | string): string {
  const id = typeof book === 'string' ? book : book.slug || book.id
  return `/libro/${encodeURIComponent(id)}`
}
