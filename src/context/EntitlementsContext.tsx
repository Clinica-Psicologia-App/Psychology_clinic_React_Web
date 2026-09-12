import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentClinicEntitlements } from '../services/supabaseQueries'
import { useAuth } from './auth'
import { isPlatformAdminScope } from '../lib/roleAccess'
import { EntitlementsContext, type EntitlementsContextValue } from './entitlements'

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const enabled = Boolean(profile?.is_active && !isPlatformAdminScope(profile))
  const entitlements = useQuery({
    queryKey: ['current-clinic-entitlements', profile?.id, profile?.clinic_id],
    queryFn: getCurrentClinicEntitlements,
    enabled,
    retry: 1,
  })

  const value = useMemo<EntitlementsContextValue>(() => {
    const features = entitlements.data ?? []
    const byKey = new Map(features.map((feature) => [feature.feature_key, feature]))

    return {
      features,
      loading: entitlements.isLoading,
      error: entitlements.error,
      isFeatureEnabled: (featureKey?: string | null) => {
        if (!featureKey) return true
        if (!enabled) return true
        if (entitlements.error) return true
        const feature = byKey.get(featureKey)
        return feature ? feature.is_enabled : true
      },
    }
  }, [enabled, entitlements.data, entitlements.error, entitlements.isLoading])

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
}
