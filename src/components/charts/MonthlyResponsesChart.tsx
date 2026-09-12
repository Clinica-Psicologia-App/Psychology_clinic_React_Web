import { ClipboardList } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartPanel, EmptyChartState } from '../design-system/ChartPanel'
import { chartColor, chartTheme } from './chartTheme'

type MonthlyPoint = {
  label: string
  responses: number
  completed: number
}

export function MonthlyResponsesChart({ data, title, description }: {
  data: MonthlyPoint[]
  title: string
  description: string
}) {
  return (
    <ChartPanel title={title} description={description} icon={ClipboardList}>
      <div className="chart-box">
        {data.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={chartTheme.margins}>
              <CartesianGrid {...chartTheme.grid} />
              <XAxis dataKey="label" {...chartTheme.axis} />
              <YAxis {...chartTheme.axis} allowDecimals={false} />
              <Tooltip {...chartTheme.tooltip} />
              <Bar dataKey="responses" name="Respostas" fill={chartColor(1)} radius={chartTheme.barRadius} />
              <Bar dataKey="completed" name="Concluídas" fill={chartColor(0)} radius={chartTheme.barRadius} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState message="Sem respostas registradas no período." />
        )}
      </div>
    </ChartPanel>
  )
}
