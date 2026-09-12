import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, type AvatarIdentity } from './Avatar'

export type EntityContact = {
  icon: LucideIcon
  value: string
}

export function EntityHeader({ icon: Icon, avatar, avatarIdentity, title, subtitle, badges, contacts }: {
  icon?: LucideIcon
  avatar?: string
  avatarIdentity?: AvatarIdentity | null
  title: string
  subtitle?: string
  badges?: ReactNode
  contacts?: EntityContact[]
}) {
  return (
    <section className="entity-header panel">
      <div className="entity-header-main">
        {avatar || avatarIdentity ? (
          <Avatar size="lg" className="settings-profile-avatar" identity={avatarIdentity ?? { full_name: avatar }} />
        ) : Icon ? (
          <div className="entity-icon"><Icon size={24} aria-hidden="true" /></div>
        ) : null}
        <div className="entity-header-copy">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
          {badges ? <div className="badge-row">{badges}</div> : null}
        </div>
      </div>
      {contacts?.length ? (
        <div className="entity-header-contacts">
          {contacts.map((contact, index) => (
            <div key={index}>
              <contact.icon size={17} aria-hidden="true" />
              <span>{contact.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
