import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { navigate } from '../lib/routing'
import { AdminMenu } from './AdminMenu'
import { IconPlus, IconSearch } from './Icons'
import { LoginModal } from './LoginModal'
import { SearchOverlay } from './SearchOverlay'

interface NavbarProps {
  current: 'home' | 'library' | 'wishlist' | 'discover' | 'other'
}

const links = [
  { id: 'home' as const, href: '/', label: 'Inicio' },
  { id: 'library' as const, href: '/biblioteca', label: 'Biblioteca' },
  { id: 'wishlist' as const, href: '/deseados', label: 'Deseados' },
]

export function Navbar({ current }: NavbarProps) {
  const { isAdmin } = useAuth()
  const { busy } = useLibrary()
  const [loginOpen, setLoginOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="navbar">
      <a
        className="brand"
        href="/"
        onClick={(event) => {
          event.preventDefault()
          navigate('/')
        }}
      >
        <img className="brand-icon" src="/Interfaz/logo-icon.png" alt="" />
        BookBox
      </a>
      <nav className="nav-links" aria-label="Principal">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            className={current === link.id ? 'is-active' : ''}
            onClick={(event) => {
              event.preventDefault()
              navigate(link.href)
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="nav-actions">
        <button type="button" className="icon-btn" aria-label="Buscar" onClick={() => setSearchOpen(true)}>
          <IconSearch className="icon" />
        </button>
        <a
          className="btn-add"
          href="/agregar"
          onClick={(event) => {
            event.preventDefault()
            if (isAdmin) navigate('/agregar')
            else setLoginOpen(true)
          }}
        >
          <IconPlus className="icon" />
          Agregar
        </a>
        <a
          className="btn-add-circle"
          href="/agregar"
          aria-label="Agregar libro"
          onClick={(event) => {
            event.preventDefault()
            if (isAdmin) navigate('/agregar')
            else setLoginOpen(true)
          }}
        >
          <IconPlus className="icon" />
        </a>
        <AdminMenu onLogin={() => setLoginOpen(true)} />
      </div>
      {busy ? <div className="busy-strip" role="status">{busy}</div> : null}
      {loginOpen ? <LoginModal onClose={() => setLoginOpen(false)} /> : null}
      {searchOpen ? <SearchOverlay onClose={() => setSearchOpen(false)} /> : null}
    </header>
  )
}
