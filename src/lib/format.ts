export function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

