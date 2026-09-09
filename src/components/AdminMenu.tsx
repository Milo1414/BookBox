import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { friendlyError } from '../lib/errors'
import { navigate } from '../lib/routing'

interface AdminMenuProps {
  onLogin: () => void
}

export function AdminMenu({ onLogin }: AdminMenuProps) {
  const { configured, isAdmin, user, signOut } = useAuth()
  const { exportLibrary, importLibraryJson, showToast } = useLibrary()
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const initial = user?.email?.[0]?.toUpperCase() ?? 'C'

  if (!isAdmin) {
    return (
      <button type="button" id="profile-trigger" className="avatar-btn" aria-label="Ingresar" onClick={onLogin}>
        {initial}
      </button>
    )
  }

  async function onImport(file?: File) {
    if (!file) return
    try {
      const payload = JSON.parse(await file.text()) as unknown
      const preview = Array.isArray((payload as { books?: unknown }).books)
        ? (payload as { books: unknown[] }).books
        : Array.isArray(payload)
          ? payload
          : []
      const ok = window.confirm(`El archivo tiene ${preview.length} libros. Se van a agregar solo los que no existan (merge). ¿Continuar?`)
      if (!ok) return
      const result = await importLibraryJson(payload)
      showToast(`Importados ${result.added}. Omitidos ${result.skipped}.`)
    } catch (error) {
      showToast(friendlyError(error, 'No pude importar ese JSON.'))
    }
  }

  async function onSignOut() {
    try {
      await signOut()
      showToast('Sesión cerrada.')
      setOpen(false)
    } catch (error) {
      showToast(friendlyError(error))
    }
  }

  return (
    <div className="admin-menu">
      <button type="button" id="profile-trigger" className="avatar-btn" aria-label="Perfil" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {initial}
      </button>
      {open ? (
        <div className="admin-dropdown" role="menu">
          {user?.email ? <p className="admin-email">{user.email}</p> : null}
          <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/agregar') }}>
            Agregar libro
          </button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/subir-epub') }}>
            Subir EPUB
          </button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); exportLibrary() }}>
            Exportar biblioteca
          </button>
          <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>
            Importar biblioteca
          </button>
          {configured ? (
            <button type="button" role="menuitem" onClick={() => void onSignOut()}>
              Cerrar sesión
            </button>
          ) : null}
        </div>
      ) : null}
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => void onImport(event.target.files?.[0])} />
    </div>
  )
}
