import { Badge } from './Badge'

export function CapacityCell({ used, limit, canReceive }: {
  used: number
  limit: number | null | undefined
  canReceive: boolean
}) {
  if (!canReceive) {
    return (
      <div className="capacity-cell">
        <Badge tone="danger">Bloqueado</Badge>
        <small>{used} em uso</small>
      </div>
    )
  }

  if (limit == null || limit <= 0) {
    return (
      <div className="capacity-cell">
        <strong>{used}</strong>
        <small>Sem limite definido</small>
      </div>
    )
  }

  const percent = Math.min(100, Math.round((used / limit) * 100))
  const tone = used > limit ? 'danger' : percent >= 90 ? 'warning' : 'success'

  return (
    <div className="capacity-cell">
      <div className="capacity-cell-top">
        <strong>{used}/{limit}</strong>
        <Badge tone={tone}>{percent}%</Badge>
      </div>
      <div className="capacity-track" aria-hidden="true">
        <i style={{ width: `${percent}%` }} className={tone} />
      </div>
      <small>{percent}% da capacidade</small>
    </div>
  )
}
