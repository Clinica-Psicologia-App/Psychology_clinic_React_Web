import { LockKeyhole } from 'lucide-react'
import { EmptyState, RouteLoadingState } from './Ui'
import { useEntitlements } from '../context/entitlements'

export function FeatureGate({ featureKey, children, fallback }: {
  featureKey?: string | null
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { isFeatureEnabled, loading } = useEntitlements()

  if (loading) return <RouteLoadingState />
  if (!isFeatureEnabled(featureKey)) {
    return fallback ?? (
      <div className="page-stack">
        <EmptyState
          icon={LockKeyhole}
          title="Módulo indisponível neste plano"
          description="Esta funcionalidade foi desabilitada para a clínica atual. Ajuste os entitlements em Planos para liberar o acesso."
        />
      </div>
    )
  }

  return children
}
