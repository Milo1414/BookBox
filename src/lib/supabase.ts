import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AUTH_STORAGE_KEY } from '../constants'
import { authStorage } from './authStorage'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: authStorage,
          storageKey: AUTH_STORAGE_KEY,
        },
      })
    : null
