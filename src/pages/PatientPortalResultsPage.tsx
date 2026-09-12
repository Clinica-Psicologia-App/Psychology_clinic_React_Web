import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, ClipboardCheck, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { formatDate } from '../lib/format'
import { getPatientPortalResults } from '../services/supabaseQueries'
import type { PatientQuestionnaireResultRow } from '../types'

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function classificationLabel(value?: string | null) {
  if (!value) return 'Sem classificação'
  if (value === 'pending_review') return 'Aguardando revisão'
  return value.replaceAll('_', ' ')
}

function groupResults(results: PatientQuestionnaireResultRow[]) {
  const map = new Map<string, PatientQuestionnaireResultRow[]>()
  for (const result of results) {
    const current = map.get(result.response_id) ?? []
    current.push(result)
    map.set(result.response_id, current)
  }
  return map
}

export function PatientPortalResultsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['patient-portal-results'],
    queryFn: getPatientPortalResults,
  })
  const resultsByResponse = useMemo(() => groupResults(data?.responseResults ?? []), [data?.responseResults])
  const released = Boolean(data?.patient.results_released_at)
  const visibleResponses = data?.responses.filter((response) => (resultsByResponse.get(response.id) ?? []).length > 0) ?? []

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Meus resultados"
        description="Resultados liberados pelo seu psicólogo responsável."
      />

      <DataState loading={isLoading} error={error} onRetry={() => refetch()}>
        {data ? (
          <>
            <section className="stats-grid three">
              <StatCard label="Questionários concluídos" value={data.responses.length} icon={ClipboardCheck} />
              <StatCard label="Resultados visíveis" value={visibleResponses.length} icon={BarChart3} tone="blue" />
              <StatCard label="Liberação" value={released ? 'Ativa' : 'Pendente'} icon={ShieldCheck} tone={released ? 'navy' : 'warning'} detail={released ? `Desde ${formatDate(data.patient.results_released_at)}` : 'Aguardando revisão'} />
            </section>

            {!released ? (
              <EmptyState
                icon={LockKeyhole}
                title="Resultados ainda não liberados"
                description="Seu psicólogo precisa revisar e liberar os resultados antes que eles apareçam aqui."
              />
            ) : null}

            {released && visibleResponses.length ? (
              <section className="clinical-results-stack">
                {visibleResponses.map((response) => {
                  const results = resultsByResponse.get(response.id) ?? []
                  return (
                    <article className="panel result-breakdown-card open" key={response.id}>
                      <div className="result-breakdown-summary">
                        <span>
                          <strong>{response.questionnaire_name}</strong>
                          <small>{response.questionnaire_code} · concluído em {response.completed_at ? formatDate(response.completed_at) : 'data não informada'}</small>
                        </span>
                        <span className="result-breakdown-meta">
                          <Badge tone="success">{results.length} categorias</Badge>
                        </span>
                      </div>
                      <div className="result-breakdown-body">
                        <div className="table-card compact-table report-table detail-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Categoria</th>
                                <th>Média</th>
                                <th>Classificação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.map((result) => (
                                <tr key={result.id}>
                                  <td><strong>{result.category_name ?? result.category_code ?? 'Categoria'}</strong></td>
                                  <td>{formatNumber(result.average_score)}</td>
                                  <td>{classificationLabel(result.classification)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </section>
            ) : null}

            {released && !visibleResponses.length ? (
              <EmptyState
                icon={BarChart3}
                title="Nenhum resultado calculado"
                description="Você já tem liberação, mas ainda não há resultados concluídos disponíveis."
              />
            ) : null}
          </>
        ) : null}
      </DataState>
    </div>
  )
}
