import { useEffect } from 'react'
import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { Button } from './Button'

type NoticeTone = 'success' | 'error' | 'info' | 'warning'

const toneConfig: Record<NoticeTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'notice-success' },
  error: { icon: AlertTriangle, className: 'notice-error' },
  info: { icon: Info, className: 'notice-info' },
  warning: { icon: AlertTriangle, className: 'notice-warning' },
}

export function InlineNotice({ tone = 'info', message, onDismiss, autoDismissMs }: {
  tone?: NoticeTone
  message: string
  onDismiss?: () => void
  autoDismissMs?: number
}) {
  const { icon: Icon, className } = toneConfig[tone]

  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return
    const timer = window.setTimeout(onDismiss, autoDismissMs)
    return () => window.clearTimeout(timer)
  }, [autoDismissMs, onDismiss, message])

  return (
    <div className={clsx('inline-notice', className)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <span className="inline-notice-message">{message}</span>
      {onDismiss ? (
        <Button variant="ghost" size="icon" className="inline-notice-dismiss" onClick={onDismiss} aria-label="Fechar aviso">
          <X size={16} />
        </Button>
      ) : null}
    </div>
  )
}
