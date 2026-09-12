import { AlertCircle } from 'lucide-react'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

export function DataState({ loading, error, children, onRetry }: {
  loading: boolean
  error: unknown
  children: React.ReactNode
  onRetry?: () => void
}) {
  if (loading) {
    return (
      <div className="skeleton-panel" role="status" aria-live="polite" aria-label="Carregando dados">
        <div className="skeleton-heading" />
        <div className="skeleton-grid">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
      </div>
    )
  }

  if (error) {
    const message = String((error as Error)?.message ?? error)
    return (
      <div className="state-panel state-error" role="alert">
        <AlertCircle size={22} aria-hidden="true" />
        <div>
          <strong>Não foi possível carregar os dados</strong>
          <p>{message}</p>
        </div>
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>Tentar novamente</Button>
        ) : null}
      </div>
    )
  }

  return children
}

export function RouteLoadingState() {
  return (
    <div className="skeleton-panel route-loading" role="status" aria-label="Carregando tela">
      <div className="skeleton-heading" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  )
}

export { EmptyState }
