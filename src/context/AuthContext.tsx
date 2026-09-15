import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, supabaseConfigError } from '../lib/supabase'
import { getCurrentProfile } from '../services/supabaseQueries'
import type { AdminProfile } from '../types'
import { AuthContext } from './auth'

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  async function refreshProfile() {
    setAuthError(null)
    try {
      const currentProfile = await getCurrentProfile()
      setProfile(currentProfile)
    } catch (error) {
      setProfile(null)
      setAuthError(messageFromError(error))
    }
  }

  useEffect(() => {
    if (supabaseConfigError) {
      setAuthError(supabaseConfigError)
      setLoading(false)
      return
    }

    let mounted = true
    const client = getSupabase()

    client.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) {
        try {
          await refreshProfile()
        } finally {
          if (mounted) setLoading(false)
        }
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setAuthError(null)
        setLoading(false)
        return
      }
      getCurrentProfile()
        .then((currentProfile) => {
          setProfile(currentProfile)
          setAuthError(null)
        })
        .catch((error) => {
          setProfile(null)
          setAuthError(messageFromError(error))
        })
        .finally(() => setLoading(false))
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    setAuthError(null)
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw error
    await refreshProfile()
  }

  async function signOut() {
    if (supabaseConfigError) return
    await getSupabase().auth.signOut()
    setSession(null)
    setProfile(null)
    setAuthError(null)
  }

  async function resetPassword(email: string) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) throw error
  }

  async function updatePassword(password: string) {
    const { error } = await getSupabase().auth.updateUser({ password })
    if (error) throw error
  }

  const value = useMemo(
    () => ({ session, profile, loading, authError, signIn, signOut, refreshProfile, resetPassword, updatePassword }),
    [session, profile, loading, authError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
