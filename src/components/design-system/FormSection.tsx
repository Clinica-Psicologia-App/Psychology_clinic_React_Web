import type { ReactNode } from 'react'

export function FormSection({ title, description, children }: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="form-section">
      <header>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="form-grid two">{children}</div>
    </section>
  )
}
