import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, ChevronDown, ClipboardList } from 'lucide-react'
import clsx from 'clsx'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { formatDate } from '../../lib/format'
import type { PatientDetailData, PatientQuestionnaireAnswerRow, PatientQuestionnaireResultRow } from '../../types'

// ── Taxonomia YSQ — nomes curtos para o eixo do gráfico ──────────────────────

const YSQ_SHORT_NAMES: Record<string, string> = {
  YSQ_SCHEMA_ABANDONMENT_INSTABILITY:     'Abandono',
  YSQ_SCHEMA_MISTRUST_ABUSE:              'Desconfiança',
  YSQ_SCHEMA_EMOTIONAL_DEPRIVATION:       'Privação emocional',
  YSQ_SCHEMA_DEFECTIVENESS_SHAME:         'Defectividade',
  YSQ_SCHEMA_SOCIAL_ISOLATION:            'Isolamento social',
  YSQ_SCHEMA_DEPENDENCE_INCOMPETENCE:     'Dependência',
  YSQ_SCHEMA_VULNERABILITY:               'Vulnerabilidade',
  YSQ_SCHEMA_ENMESHMENT_UNDEVELOPED_SELF: 'Emaranhamento',
  YSQ_SCHEMA_FAILURE:                     'Fracasso',
  YSQ_SCHEMA_ENTITLEMENT_GRANDIOSITY:     'Arrogo',
  YSQ_SCHEMA_INSUFFICIENT_SELF_CONTROL:   'Autocontrole insuf.',
  YSQ_SCHEMA_SUBJUGATION:                 'Subjugação',
  YSQ_SCHEMA_SELF_SACRIFICE:              'Autossacrifício',
  YSQ_SCHEMA_APPROVAL_SEEKING:            'Busca de aprovação',
  YSQ_SCHEMA_NEGATIVISM_PESSIMISM:        'Negativismo',
  YSQ_SCHEMA_EMOTIONAL_INHIBITION:        'Inibição emocional',
  YSQ_SCHEMA_UNRELENTING_STANDARDS:       'Padrões inflexíveis',
  YSQ_SCHEMA_PUNITIVENESS:               'Postura punitiva',
}

const YSQ_ACTIVATION_THRESHOLD = 4.0

// ── Severidade por score (escala 1–6, espelha ScoringSeverity Flutter) ────────

function severityColor(score: number): string {
  if (score >= YSQ_ACTIVATION_THRESHOLD) return '#E24B4A'   // ativado — vermelho Flutter
  if (score >= 3) return '#F59E0B'                          // próximo — âmbar
  return '#0F9C90'                                          // inativo — teal
}

function severityTone(score: number): 'danger' | 'warning' | 'success' {
  if (score >= YSQ_ACTIVATION_THRESHOLD) return 'danger'
  if (score >= 3) return 'warning'
  return 'success'
}

// ── Helpers existentes ────────────────────────────────────────────────────────

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function classificationLabel(value?: string | null) {
  if (!value) return 'Sem classificação'
  if (value === 'pending_review') return 'Aguardando revisão'
  return value.replaceAll('_', ' ')
}

function classificationTone(value?: string | null, score?: number | null) {
  if (score != null) return severityTone(score)
  if (!value) return 'neutral' as const
  if (value === 'pending_review') return 'warning' as const
  if (['high', 'very_high', 'elevated', 'severe'].includes(value)) return 'danger' as const
  if (['low', 'very_low', 'normal', 'mild'].includes(value)) return 'success' as const
  return 'info' as const
}

function answerLabel(answer: PatientQuestionnaireAnswerRow) {
  const base = formatNumber(answer.answer_value)
  if (answer.professional_value == null || answer.professional_value === answer.answer_value) return base
  return `${base} → ${formatNumber(answer.professional_value)}`
}

function topResults(results: PatientQuestionnaireResultRow[]) {
  return [...results]
    .sort((a, b) => (b.professional_average_score ?? b.average_score ?? 0) - (a.professional_average_score ?? a.average_score ?? 0))
    .slice(0, 6)
}

// ── Schema Bar Chart ──────────────────────────────────────────────────────────

interface SchemaBarEntry {
  name: string
  score: number
  activated: boolean
  code: string
}

function SchemaBarSection({ results }: { results: PatientQuestionnaireResultRow[] }) {
  const ysqResults = results.filter((r) => r.category_code?.startsWith('YSQ_SCHEMA_'))
  if (ysqResults.length < 3) return null

  const chartData: SchemaBarEntry[] = ysqResults
    .map((r) => {
      const score = r.professional_average_score ?? r.average_score ?? 0
      return {
        name: YSQ_SHORT_NAMES[r.category_code ?? ''] ?? r.category_name ?? r.category_code ?? '',
        score: Math.round(score * 100) / 100,
        activated: score >= YSQ_ACTIVATION_THRESHOLD,
        code: r.category_code ?? '',
      }
    })
    .sort((a, b) => b.score - a.score)

  const activatedCount = chartData.filter((d) => d.activated).length
  const chartHeight = Math.max(220, chartData.length * 26)

  return (
    <div className="schema-bar-section">
      <div className="schema-bar-header">
        <span className="schema-bar-title">Perfil de esquemas YSQ</span>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {activatedCount > 0 && (
            <Badge tone="danger">{activatedCount} ativado{activatedCount !== 1 ? 's' : ''} (≥ 4.0)</Badge>
          )}
          <Badge tone="neutral">{chartData.length} esquemas</Badge>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
        >
          <XAxis
            type="number"
            domain={[1, 6]}
            ticks={[1, 2, 3, 4, 5, 6]}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11, fill: 'var(--text-body)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number, _name: string, props: { payload?: SchemaBarEntry }) => [
              `${formatNumber(value)} / 6`,
              props.payload?.activated ? '● Ativado' : '○ Inativo',
            ]}
            labelStyle={{ fontSize: 12, fontWeight: 600 }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}
          />
          <ReferenceLine
            x={YSQ_ACTIVATION_THRESHOLD}
            stroke="#E24B4A"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: 'Ativado', position: 'insideTopRight', fontSize: 10, fill: '#E24B4A', dy: -4 }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {chartData.map((entry) => (
              <Cell key={entry.code} fill={severityColor(entry.score)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="schema-bar-legend">
        <span><span style={{ background: '#E24B4A', opacity: 0.85 }} />Ativado (≥ 4.0)</span>
        <span><span style={{ background: '#F59E0B', opacity: 0.85 }} />Próximo (3–3.9)</span>
        <span><span style={{ background: '#0F9C90', opacity: 0.85 }} />Inativo (&#60; 3)</span>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function PatientResultsBreakdown({ data }: { data: PatientDetailData }) {
  const completedResponses = data.responses.filter((response) => response.status === 'completed')
  const [openResponseId, setOpenResponseId] = useState<string | null>(completedResponses[0]?.id ?? null)

  const grouped = useMemo(() => {
    const resultsByResponse = new Map<string, PatientQuestionnaireResultRow[]>()
    const answersByResponse = new Map<string, PatientQuestionnaireAnswerRow[]>()

    for (const result of data.responseResults) {
      const current = resultsByResponse.get(result.response_id) ?? []
      current.push(result)
      resultsByResponse.set(result.response_id, current)
    }

    for (const answer of data.responseAnswers) {
      const current = answersByResponse.get(answer.response_id) ?? []
      current.push(answer)
      answersByResponse.set(answer.response_id, current)
    }

    return completedResponses.map((response) => ({
      response,
      results: resultsByResponse.get(response.id) ?? [],
      answers: answersByResponse.get(response.id) ?? [],
    }))
  }, [completedResponses, data.responseAnswers, data.responseResults])

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Breakdown clínico</span>
          <h2>Respostas, scores e categorias</h2>
          <p>Leitura profissional dos resultados calculados pelo backend, incluindo contexts quando existem.</p>
        </div>
        <BarChart3 size={20} aria-hidden="true" />
      </div>

      {grouped.length ? (
        <div className="clinical-results-stack">
          {grouped.map(({ response, results, answers }) => {
            const open = openResponseId === response.id
            const highlighted = topResults(results)
            return (
              <section className={clsx('result-breakdown-card', open && 'open')} key={response.id}>
                <button type="button" className="result-breakdown-summary" onClick={() => setOpenResponseId(open ? null : response.id)}>
                  <span>
                    <strong>{response.questionnaire_name}</strong>
                    <small>{response.questionnaire_code} · concluído em {response.completed_at ? formatDate(response.completed_at) : 'data não informada'}</small>
                  </span>
                  <span className="result-breakdown-meta">
                    <Badge tone={results.length ? 'success' : 'warning'}>{results.length} categorias</Badge>
                    <Badge tone="neutral">{answers.length} respostas</Badge>
                    <ChevronDown size={17} aria-hidden="true" />
                  </span>
                </button>

                {open ? (
                  <div className="result-breakdown-body">
                    {/* Gráfico YSQ quando aplicável */}
                    <SchemaBarSection results={results} />

                    {/* Tabela de categorias principais */}
                    {highlighted.length ? (
                      <div className="table-card compact-table report-table detail-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Categoria</th>
                              <th>Score</th>
                              <th>Total</th>
                              <th>Severidade</th>
                              <th>Nota profissional</th>
                            </tr>
                          </thead>
                          <tbody>
                            {highlighted.map((result) => {
                              const score = result.professional_average_score ?? result.average_score
                              return (
                                <tr key={result.id}>
                                  <td>
                                    <strong>{result.category_name ?? result.category_code ?? 'Categoria'}</strong>
                                    <small>{result.category_code ?? 'sem código'}</small>
                                  </td>
                                  <td>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          width: score != null ? `${Math.min(100, (score / 6) * 100)}%` : 0,
                                          minWidth: 4,
                                          height: 6,
                                          maxWidth: 56,
                                          background: score != null ? severityColor(score) : 'var(--border)',
                                          borderRadius: 3,
                                          opacity: 0.8,
                                        }}
                                      />
                                      {formatNumber(score)}
                                    </span>
                                  </td>
                                  <td>{formatNumber(result.total_score)}</td>
                                  <td>
                                    <Badge tone={classificationTone(result.classification, score)}>
                                      {result.classification ? classificationLabel(result.classification) : (score != null && score >= YSQ_ACTIVATION_THRESHOLD ? 'Ativado' : 'Inativo')}
                                    </Badge>
                                  </td>
                                  <td>{result.professional_note || '-'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty">Resposta concluída, mas ainda sem resultados calculados.</div>
                    )}

                    {/* Amostra de respostas */}
                    {answers.length ? (
                      <div className="clinical-answer-sample">
                        <div className="panel-header compact">
                          <div><h3>Amostra de respostas</h3><p>Primeiros itens registrados, com contexto e ajuste profissional quando houver.</p></div>
                          <ClipboardList size={18} aria-hidden="true" />
                        </div>
                        <div className="executive-list compact-list">
                          {answers.slice(0, 8).map((answer) => (
                            <div key={answer.id}>
                              <strong>{answer.question_code} · {answer.question_text}</strong>
                              <span>{answer.context_label ? `${answer.context_label} · ` : ''}Resposta: {answerLabel(answer)}</span>
                            </div>
                          ))}
                        </div>
                        {answers.length > 8 ? <p className="helper-text">Mostrando 8 de {answers.length} respostas para manter a revisão rápida.</p> : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Nenhuma resposta concluída"
          description="Quando o paciente finalizar instrumentos, os scores e categorias aparecerão aqui para revisão profissional."
        />
      )}

      <div className="panel-actions">
        <Button variant="ghost" size="sm" onClick={() => setOpenResponseId(grouped[0]?.response.id ?? null)} disabled={!grouped.length}>
          Abrir resultado mais recente
        </Button>
      </div>
    </article>
  )
}
