import { useEffect, useState } from 'react'
import { BookDetail } from './components/BookDetail'
import { BookForm } from './components/BookForm'
import { EpubImport } from './components/EpubImport'
import { MigrationBanner, OfflineBanner } from './components/Banners'
import { Navbar } from './components/Navbar'
import { Toast } from './components/Toast'
import { useAuth } from './context/AuthContext'
import { useLibrary } from './context/LibraryContext'
import { parsePath, type AppRoute } from './lib/routing'
import { MobileTabBar } from './components/MobileTabBar'
import { Discover } from './pages/Discover'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { Wishlist } from './pages/Wishlist'

function navState(route: AppRoute): 'home' | 'library' | 'wishlist' | 'discover' | 'other' {
  if (route.page === 'home') return 'home'
  if (route.page === 'library') return 'library'
  if (route.page === 'wishlist') return 'wishlist'
  if (route.page === 'discover') return 'discover'
  return 'other'
}

export default function App() {
  const { isAdmin, loading: authLoading } = useAuth()
  const { getBook, toast, dismissToast, loading } = useLibrary()
  const [route, setRoute] = useState<AppRoute>(() => parsePath(window.location.pathname))

  useEffect(() => {
    const onPop = () => setRoute(parsePath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismissToast, 2800)
    return () => window.clearTimeout(timer)
  }, [toast, dismissToast])

  const adminOnly = route.page === 'form' || route.page === 'epub'
  let content = null
  if (authLoading || loading) {
    content = (
      <div className="page">
        <div className="empty-state">
          <p className="empty-title">Cargando biblioteca…</p>
        </div>
      </div>
    )
  } else if (adminOnly && !isAdmin) {
    content = <MissingBook title="Necesitás ingresar" />
  }   else if (route.page === 'home') content = <Home />
  else if (route.page === 'library') content = <Library />
  else if (route.page === 'wishlist') content = <Wishlist />
  else if (route.page === 'discover') content = <Discover />
  else if (route.page === 'epub') {
    const book = route.id ? getBook(route.id) : undefined
    content = route.id && !book ? <MissingBook /> : <EpubImport replaceBook={book} />
  } else if (route.page === 'form') {
    const book = route.id ? getBook(route.id) : undefined
    content = route.id && !book ? <MissingBook /> : <BookForm book={book} />
  } else if (route.page === 'detail') {
    const book = getBook(route.id)
    content = book ? <BookDetail book={book} /> : <MissingBook />
  } else {
    content = <MissingBook title="Página no encontrada" />
  }

  return (
    <div className="app-shell">
      <Navbar current={navState(route)} />
      <main>
        <OfflineBanner />
        {isAdmin ? <MigrationBanner /> : null}
        {content}
      </main>
      {toast ? <Toast message={toast.message} onDismiss={dismissToast} /> : null}
      <MobileTabBar current={navState(route)} />
    </div>
  )
}

function MissingBook({ title = 'No encontré ese libro' }: { title?: string }) {
  return (
    <div className="page">
      <div className="empty-state">
        <p className="empty-title">{title}</p>
        <p className="empty-text">Puede que lo hayas eliminado o que el enlace ya no exista.</p>
      </div>
    </div>
  )
}
