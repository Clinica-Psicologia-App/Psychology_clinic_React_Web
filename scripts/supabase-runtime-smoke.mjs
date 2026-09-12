import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadDotEnv(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    process.env[key] ??= value
  }
}

loadDotEnv(resolve(process.cwd(), '.env.local'))
loadDotEnv(resolve(process.cwd(), '.env'))

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const patientId = process.env.SMOKE_PATIENT_ID

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function errorMessage(error) {
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

async function check(label, fn) {
  try {
    await fn()
    console.log(`PASS ${label}`)
  } catch (error) {
    console.error(`FAIL ${label}: ${errorMessage(error)}`)
    process.exitCode = 1
  }
}

await check('Supabase auth endpoint', async () => {
  const { error } = await supabase.auth.getSession()
  if (error) throw error
})

let signedIn = false

if (email && password) {
  await check('Smoke user login', async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    signedIn = true
  })
} else {
  console.log('SKIP Smoke user login: set SMOKE_EMAIL and SMOKE_PASSWORD.')
}

if (signedIn) {
  await check('RPC get_current_clinic_entitlements', async () => {
    const { error } = await supabase.rpc('get_current_clinic_entitlements')
    if (error) throw error
  })

  await check('RPC get_psychologist_alerts', async () => {
    const { error } = await supabase.rpc('get_psychologist_alerts')
    if (error) throw error
  })

  await check('RPC get_patients_data_completion', async () => {
    const { error } = await supabase.rpc('get_patients_data_completion')
    if (error) throw error
  })
} else {
  console.log('SKIP protected RPC checks: login required.')
}

if (signedIn && patientId) {
  await check('Edge generate-clinical-report', async () => {
    const { data, error } = await supabase.functions.invoke('generate-clinical-report', {
      body: {
        patient_id: patientId,
        include: {
          questionnaires: true,
          mental_map: true,
          goals: true,
          problems: true,
          check_ins: true,
          daily_monitors: true,
          timeline: true,
          genogram: true,
        },
      },
    })
    if (error) throw error
    if (!(data instanceof Blob) && !(data instanceof ArrayBuffer) && !Array.isArray(data)) {
      throw new Error('generate-clinical-report did not return binary PDF data.')
    }
  })
} else if (!patientId) {
  console.log('SKIP Edge generate-clinical-report: set SMOKE_PATIENT_ID.')
} else {
  console.log('SKIP Edge generate-clinical-report: login required.')
}

await supabase.auth.signOut()
