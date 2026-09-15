import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { ChartPanel, EmptyChartState } from '../design-system/ChartPanel'
import { chartTheme, chartColor } from '../charts/chartTheme'
import { formatDate } from '../../lib/format'
import type { PatientDetailData, PatientQuestionnaireResultRow, PatientQuestionnaireResponseRow } from '../../types'

type ScorePoint = {
  date: string
  [category: string]: string | number | null
}

function buildSeriesData(
  responses: PatientQuestionnaireResponseRow[],
  results: PatientQuestionnaireResultRow[],
  instrument: string,
) {
  const byResponseId = new Map<string, PatientQuestionnaireResultRow[]>()
  for (const result of results) {
    const arr = byResponseId.get(result.response_id) ?? []
    arr.push(result)
    byResponseId.set(result.response_id, arr)
  }

  const completed = responses
    .filter((r) => r.questionnaire_name === instrument && r.status === 'completed' && r.completed_at)
    .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime())

  const points: ScorePoint[] = []
  const categories = new Set<string>()

  for (const response of completed) {
    const responseResults = byResponseId.get(response.id) ?? []
    const point: ScorePoint = { date: formatDate(response.completed_at!) }
    for (const result of responseResults) {
      const key = result.category_name ?? result.category_code ?? 'Categoria'
      categories.add(key)
      point[key] = result.average_score ?? null
    }
    points.push(point)
  }

  return { points, categories: Array.from(categories) }
}

export function PatientScoreEvolutionPanel({ data }: { data: PatientDetailData }) {
  const instruments = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const response of data.responses) {
      if (response.status === 'completed' && !seen.has(response.questionnaire_name)) {
        seen.add(response.questionnaire_name)
        list.push(response.questionnaire_name)
      }
    }
    return list
  }, [data.responses])

  const [selected, setSelected] = useState(0)
  const instrument = instruments[selected] ?? null

  const { points, categories } = useMemo(
    () => instrument ? buildSeriesData(data.responses, data.responseResults, instrument) : { points: [], categories: [] },
    [data.responses, data.responseResults, instrument],
  )

  if (!instruments.length) return null

  return (
    <ChartPanel
      title="Evolução de scores"
      description="Variação dos resultados ao longo do tempo, por instrumento de avaliação."
      icon={TrendingUp}
    >
      {instruments.length > 1 ? (
        <div className="score-evolution-tabs">
          {instruments.map((inst, idx) => (
            <button
              key={inst}
              type="button"
              className={`score-evolution-tab${selected === idx ? ' active' : ''}`}
              onClick={() => setSelected(idx)}
            >
              {inst}
            </button>
          ))}
        </div>
      ) : null}

      <div className="chart-box">
        {points.length >= 2 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points} margin={chartTheme.margins}>
              <CartesianGrid {...chartTheme.grid} />
              <XAxis dataKey="date" {...chartTheme.axis} />
              <YAxis {...chartTheme.axis} domain={['auto', 'auto']} />
              <Tooltip {...chartTheme.tooltip} />
              {categories.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
              {categories.map((cat, idx) => (
                <Line
                  key={cat}
                  dataKey={cat}
                  name={cat}
                  stroke={chartColor(idx)}
                  strokeWidth={2}
                  dot={{ r: 4, fill: chartColor(idx) }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState message={points.length === 1 ? 'Aplique o instrumento mais de uma vez para ver a evolução.' : 'Nenhuma resposta concluída para este instrumento.'} />
        )}
      </div>
    </ChartPanel>
  )
}
