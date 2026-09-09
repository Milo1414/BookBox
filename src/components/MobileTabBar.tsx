import { useAuth } from '../context/AuthContext'
import { navigate } from '../lib/routing'
import { IconCompass, IconHome, IconLibrary } from './Icons'

interface MobileTabBarProps {
  current: 'home' | 'library' | 'wishlist' | 'discover' | 'other'
  onProfile: () => void
}

const tabs = [
  { id: 'home' as const, href: '/', label: 'Inicio', Icon: IconHome },
  { id: 'library' as const, href: '/biblioteca', label: 'Biblioteca', Icon: IconLibrary },
  { id: 'discover' as const, href: '/descubrir', label: 'Descubrir', Icon: IconCompass },
]

export function MobileTabBar({ current, onProfile }: MobileTabBarProps) {
  const { user } = useAuth()
  const initial = user?.email?.[0]?.toUpperCase() ?? 'C'

  return (
    <nav className="tabbar" aria-label="Principal">
      {tabs.map((tab) => {
        const Icon = tab.Icon
        const active = current === tab.id
        return (
          <a
            key={tab.id}
            href={tab.href}
            className={`tabbar-item ${active ? 'is-active' : ''}`}
            onClick={(event) => {
              event.preventDefault()
              navigate(tab.href)
            }}
          >
            <span className="tabbar-icon">
              <Icon className="icon" />
            </span>
            <span>{tab.label}</span>
          </a>
        )
      })}
      <button type="button" className={`tabbar-item ${current === 'other' ? '' : ''}`} onClick={onProfile}>
        <span className="tabbar-icon tabbar-avatar">{initial}</span>
        <span>Perfil</span>
      </button>
    </nav>
  )
}
