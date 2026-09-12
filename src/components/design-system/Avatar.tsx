import clsx from 'clsx'
import type { CSSProperties } from 'react'

type AvatarConfig = {
  background?: string
  foreground?: string
  accent?: string
  pattern?: 'ring' | 'split' | 'dot'
}

export type AvatarIdentity = {
  full_name?: string | null
  email?: string | null
  avatar_type?: 'initials' | 'photo' | 'custom' | string | null
  avatar_url?: string | null
  avatar_config?: Record<string, unknown> | null
}

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || 'A'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function normalizeConfig(config?: Record<string, unknown> | null): AvatarConfig {
  if (!config) return {}
  return {
    background: typeof config.background === 'string' ? config.background : undefined,
    foreground: typeof config.foreground === 'string' ? config.foreground : undefined,
    accent: typeof config.accent === 'string' ? config.accent : undefined,
    pattern: config.pattern === 'ring' || config.pattern === 'split' || config.pattern === 'dot' ? config.pattern : undefined,
  }
}

export function Avatar({ identity, size = 'md', className, title }: {
  identity?: AvatarIdentity | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  title?: string
}) {
  const label = initials(identity?.full_name, identity?.email)
  const config = normalizeConfig(identity?.avatar_config)
  const isPhoto = identity?.avatar_type === 'photo' && Boolean(identity.avatar_url)
  const isCustom = identity?.avatar_type === 'custom'

  if (isPhoto) {
    return (
      <span className={clsx('avatar-token', `avatar-token-${size}`, 'avatar-token-photo', className)} title={title ?? identity?.full_name ?? undefined} aria-hidden="true">
        <img src={identity?.avatar_url ?? ''} alt="" />
      </span>
    )
  }

  return (
    <span
      className={clsx('avatar-token', `avatar-token-${size}`, isCustom && 'avatar-token-custom', config.pattern && `avatar-pattern-${config.pattern}`, className)}
      style={{
        '--avatar-bg': config.background,
        '--avatar-fg': config.foreground,
        '--avatar-accent': config.accent,
      } as CSSProperties}
      title={title ?? identity?.full_name ?? undefined}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}
