import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AdminProfile } from '../types'

export type AuthContextValue = {
  session: Session | null
  profile: AdminProfile | null
  loading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return value
}
