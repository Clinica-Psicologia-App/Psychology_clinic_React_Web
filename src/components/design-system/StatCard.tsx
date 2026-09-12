import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

type StatTone = 'default' | 'mint' | 'blue' | 'violet' | 'navy' | 'warning'

function normalizeTone(tone: StatTone) {
  return tone === 'mint' ? 'default' : tone
}

export function StatCard({ label, value, icon: Icon, tone = 'default', detail, trend }: {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: StatTone
  detail?: string
  trend?: string
}) {
  return (
    <article className={clsx('stat-card', normalizeTone(tone) !== 'default' && `stat-card-${normalizeTone(tone)}`)}>
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-icon" aria-hidden="true"><Icon size={18} /></div>
      </div>
      <strong className="stat-card-value">{value}</strong>
      {detail ? <small className="stat-card-detail">{detail}</small> : null}
      {trend ? <span className="stat-card-trend">{trend}</span> : null}
    </article>
  )
}
