import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import * as authService from '../services/auth'

interface AuthContextValue {
  configured: boolean
  user: User | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function needsRefresh(session: Session | null, skewMs = 60_000) {
  if (!session?.expires_at) return Boolean(session)
  return session.expires_at * 1000 < Date.now() + skewMs
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let alive = true
    const client = supabase

    const applyUser = (session: Session | null) => {
      if (alive) setUser(session?.user ?? null)
    }

    const ensureFresh = async (session: Session | null) => {
      if (!session || !needsRefresh(session)) return session
      const { data, error } = await client.auth.refreshSession()
      if (error) return session
      return data.session ?? session
    }

    void client.auth.getSession().then(async ({ data: sessionData }) => {
      applyUser(await ensureFresh(sessionData.session))
      if (alive) setLoading(false)
    })

    const { data } = client.auth.onAuthStateChange((event, session) => {
      void (async () => {
        const next = event === 'INITIAL_SESSION' ? await ensureFresh(session) : session
        applyUser(next)
        if (alive) setLoading(false)
      })()
    })

    const recover = () => {
      void client.auth.startAutoRefresh()
      void client.auth.getSession().then(async ({ data: sessionData }) => {
        applyUser(await ensureFresh(sessionData.session))
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') recover()
      else void client.auth.stopAutoRefresh()
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) recover()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)

    return () => {
      alive = false
      data.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    await authService.signIn(email, password)
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      user,
      isAdmin: isSupabaseConfigured ? Boolean(user) : true,
      loading,
      signIn,
      signOut,
    }),
    [user, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
