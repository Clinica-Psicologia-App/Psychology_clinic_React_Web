export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

export const chartTheme = {
  grid: { stroke: 'var(--chart-grid)', strokeDasharray: '3 3' },
  axis: { tickLine: false, axisLine: false, tick: { fill: 'var(--text-muted)', fontSize: 12 } },
  tooltip: {
    contentStyle: {
      background: 'var(--surface-primary)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-md)',
      fontSize: '13px',
    },
  },
  barRadius: [6, 6, 0, 0] as [number, number, number, number],
  margins: { left: -16, right: 8, top: 8, bottom: 0 },
}

export function chartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length]
}
