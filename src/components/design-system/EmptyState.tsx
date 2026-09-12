import type { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, title, description, action }: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="empty-state">
      {Icon ? <Icon size={28} className="empty-state-icon" aria-hidden="true" /> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  )
}
