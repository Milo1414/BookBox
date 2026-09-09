import { useAuth } from '../context/AuthContext'
import { navigate } from '../lib/routing'

export function AdminMenu() {
  const { user } = useAuth()
  const initial = user?.email?.[0]?.toUpperCase() ?? 'C'

  return (
    <button
      type="button"
      id="profile-trigger"
      className="avatar-btn"
      aria-label="Perfil"
      onClick={() => navigate('/perfil')}
    >
      {initial}
    </button>
  )
}
