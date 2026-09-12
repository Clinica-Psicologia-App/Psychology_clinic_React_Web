import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? 'Configuração do Supabase incompleta. Reinicie o Vite após conferir VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local.'
  : null

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })

export function getSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Cliente Supabase não inicializado.')
  }
  return supabase
}

