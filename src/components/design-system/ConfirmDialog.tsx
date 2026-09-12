import { useEffect, useId, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancelar', tone = 'danger', loading, onConfirm, onCancel }: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const titleId = useId()
  const descId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="modal-card confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
        <header>
          <h2 id={titleId}>{title}</h2>
          <p id={descId}>{description}</p>
        </header>
        <footer>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button
            ref={confirmRef}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processando...' : confirmLabel}
          </Button>
        </footer>
      </section>
    </div>
  )
}
