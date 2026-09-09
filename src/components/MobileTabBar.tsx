import { navigate } from '../lib/routing'
import { IconCompass, IconHome, IconLibrary } from './Icons'

interface MobileTabBarProps {
  current: 'home' | 'library' | 'wishlist' | 'discover' | 'other'
}

const tabs = [
  { id: 'home' as const, href: '/', label: 'Inicio', Icon: IconHome },
  { id: 'library' as const, href: '/biblioteca', label: 'Biblioteca', Icon: IconLibrary },
  { id: 'discover' as const, href: '/descubrir', label: 'Descubrir', Icon: IconCompass },
]

export function MobileTabBar({ current }: MobileTabBarProps) {
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
    </nav>
  )
}
