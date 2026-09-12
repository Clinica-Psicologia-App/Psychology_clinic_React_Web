import { createContext, useContext } from 'react'
import type { ClinicFeatureEntitlement } from '../types'

export type EntitlementsContextValue = {
  features: ClinicFeatureEntitlement[]
  loading: boolean
  error: unknown
  isFeatureEnabled: (featureKey?: string | null) => boolean
}

export const EntitlementsContext = createContext<EntitlementsContextValue | null>(null)

export function useEntitlements() {
  const value = useContext(EntitlementsContext)
  if (!value) throw new Error('useEntitlements precisa estar dentro de EntitlementsProvider')
  return value
}

export function useFeatureEnabled(featureKey?: string | null) {
  return useEntitlements().isFeatureEnabled(featureKey)
}
