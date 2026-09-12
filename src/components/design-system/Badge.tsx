import clsx from 'clsx'
import type { ReactNode } from 'react'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'clinical' | 'governance'

export function Badge({ tone = 'neutral', className, children }: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return <span className={clsx('badge', `badge-${tone}`, className)}>{children}</span>
}

export function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <Badge tone={active ? 'success' : 'neutral'}>
      {label ?? (active ? 'Ativo' : 'Inativo')}
    </Badge>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const label = role === 'platform_admin' || role === 'admin'
    ? 'Administrador'
    : role === 'psychologist'
      ? 'Psicólogo'
      : 'Paciente'
  const tone = role === 'platform_admin' || role === 'admin' ? 'governance' : role === 'psychologist' ? 'info' : 'clinical'
  return <Badge tone={tone}>{label}</Badge>
}

export function RiskBadge({ sensitive }: { sensitive: boolean }) {
  return <Badge tone={sensitive ? 'warning' : 'success'}>{sensitive ? 'Sensível' : 'Normal'}</Badge>
}
