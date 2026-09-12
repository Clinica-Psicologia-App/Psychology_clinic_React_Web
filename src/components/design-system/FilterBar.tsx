import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import clsx from 'clsx'

export function FilterBar({ children, className, resultCount, resultLabel = 'registros' }: {
  children: ReactNode
  className?: string
  resultCount?: number
  resultLabel?: string
}) {
  return (
    <div className={clsx('filter-bar', className)}>
      <div className="filter-bar-controls">{children}</div>
      {resultCount !== undefined ? (
        <span className="filter-bar-count">{resultCount} {resultLabel}</span>
      ) : null}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder, className }: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={clsx('search-field', className)}>
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder ?? 'Buscar'}
      />
    </label>
  )
}

export function FilterSelect({ value, onChange, children, label }: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  label: string
}) {
  return (
    <label className="filter-select">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        {children}
      </select>
    </label>
  )
}
