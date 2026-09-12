import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, action, meta }: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  meta?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <div className="page-header-title-row">
          <h1>{title}</h1>
          {meta ? <div className="page-header-meta">{meta}</div> : null}
        </div>
        {description ? <p className="page-header-desc">{description}</p> : null}
      </div>
      {action ? <div className="page-header-actions">{action}</div> : null}
    </header>
  )
}
