import { useState, useEffect } from 'react'
import type { ProfileRole } from '../types'

const STORAGE_KEY_PSYCH = 'onboarding_psych_done'
const STORAGE_KEY_PATIENT = 'onboarding_patient_done'
const TOUR_ROLES: ProfileRole[] = ['psychologist', 'patient']

function storageKey(role: ProfileRole) {
  return role === 'patient' ? STORAGE_KEY_PATIENT : STORAGE_KEY_PSYCH
}

export function useOnboardingTour(role: ProfileRole) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!TOUR_ROLES.includes(role)) return
    try {
      const done = localStorage.getItem(storageKey(role))
      if (!done) setOpen(true)
    } catch {}
  }, [role])

  function dismiss() {
    try { localStorage.setItem(storageKey(role), '1') } catch {}
    setOpen(false)
  }

  function reopen() {
    setOpen(true)
  }

  return { open, dismiss, reopen }
}
