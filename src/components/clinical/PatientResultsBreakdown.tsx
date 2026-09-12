import { useMemo, useState } from 'react'
import { BarChart3, ChevronDown, ClipboardList } from 'lucide-react'
import clsx from 'clsx'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { formatDate } from '../../lib/format'
import type { PatientDetailData, PatientQuestionnaireAnswerRow, PatientQuestionnaireResultRow } from '../../types'

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function classificationLabel(value?: string | null) {
  if (!value) return 'Sem classificação'
  if (value === 'pending_review') return 'Aguardando revisão'
  return value.replaceAll('_', ' ')
}

function classificationTone(value?: string | null) {
  if (!value) return 'neutral' as const
  if (value === 'pending_review') return 'warning' as const
  if (['high', 'very_high', 'elevated', 'severe'].includes(value)) return 'danger' as const
  if (['low', 'very_low', 'normal', 'mild'].includes(value)) return 'success' as const
  return 'info' as const
}

function answerLabel(answer: PatientQuestionnaireAnswerRow) {
  const base = formatNumber(answer.answer_value)
  if (answer.professional_value == null || answer.professional_value === answer.answer_value) return base
  return `${base} -> ${formatNumber(answer.professional_value)}`
}

function topResults(results: PatientQuestionnaireResultRow[]) {
  return [...results]
    .sort((a, b) => (b.professional_average_score ?? b.average_score ?? 0) - (a.professional_average_score ?? a.average_score ?? 0))
    .slice(0, 6)
}

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
          <p>Leitura profissional dos resultados calculados pelo backend, incluindo contextos quando existem.</p>
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
                    {highlighted.length ? (
                      <div className="table-card compact-table report-table detail-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Categoria</th>
                              <th>Média</th>
                              <th>Total</th>
                              <th>Classificação</th>
                              <th>Nota profissional</th>
                            </tr>
                          </thead>
                          <tbody>
                            {highlighted.map((result) => (
                              <tr key={result.id}>
                                <td><strong>{result.category_name ?? result.category_code ?? 'Categoria'}</strong><small>{result.category_code ?? 'sem código'}</small></td>
                                <td>{formatNumber(result.professional_average_score ?? result.average_score)}</td>
                                <td>{formatNumber(result.total_score)}</td>
                                <td><Badge tone={classificationTone(result.classification)}>{classificationLabel(result.classification)}</Badge></td>
                                <td>{result.professional_note || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty">Resposta concluída, mas ainda sem resultados calculados.</div>
                    )}

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
