import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/errors'

interface LoginModalProps {
  onClose: () => void
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      onClose()
    } catch (err) {
      setError(friendlyError(err, 'No pude iniciar sesión. Revisá el correo y la contraseña.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="login-title" onClick={(event) => event.stopPropagation()} onSubmit={onSubmit}>
        <h2 id="login-title">Ingresar</h2>
        <p className="muted">Solo el administrador puede modificar la biblioteca.</p>
        <label className="field">
          <span>Correo</span>
          <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Ingresando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  )
}
