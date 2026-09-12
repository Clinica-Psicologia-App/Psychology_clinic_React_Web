import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function ChartPanel({ title, description, icon: Icon, children, action }: {
  title: string
  description?: string
  icon?: LucideIcon
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <article className="panel chart-panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="panel-header-end">
          {action}
          {Icon ? <Icon size={20} aria-hidden="true" /> : null}
        </div>
      </div>
      {children}
    </article>
  )
}

export function EmptyChartState({ message = 'Sem dados suficientes para exibir o gráfico.' }: { message?: string }) {
  return <div className="chart-empty">{message}</div>
}
