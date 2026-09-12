import { useQuery } from '@tanstack/react-query'
import { Brain, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { formatDate } from '../lib/format'
import { listPatientPortalPersonalityAssessments } from '../services/supabaseQueries'

function scoreLabel(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
}

export function PatientPersonalityPage() {
  const personality = useQuery({
    queryKey: ['patient-portal-personality'],
    queryFn: listPatientPortalPersonalityAssessments,
  })

  const assessments = personality.data ?? []
  const domainCount = assessments.reduce((sum, assessment) => sum + (assessment.results?.domains?.length ?? 0), 0)
  const latest = assessments[0] ?? null

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Minha personalidade"
        description="Avaliações compartilhadas pelo seu psicólogo responsável."
      />

      <section className="stats-grid three">
        <StatCard label="Avaliações" value={assessments.length} icon={Brain} />
        <StatCard label="Domínios visíveis" value={domainCount} icon={Fingerprint} tone="blue" />
        <StatCard
          label="Compartilhamento"
          value={assessments.length ? 'Ativo' : 'Pendente'}
          icon={assessments.length ? ShieldCheck : LockKeyhole}
          tone={assessments.length ? 'navy' : 'warning'}
          detail={latest?.applied_on ? `Atualizado em ${formatDate(latest.applied_on)}` : 'Aguardando liberação'}
        />
      </section>

      <DataState loading={personality.isLoading} error={personality.error} onRetry={() => personality.refetch()}>
        {assessments.length ? (
          <section className="clinical-results-stack">
            {assessments.map((assessment) => (
              <article className="panel patient-personality-card" key={assessment.id}>
                <div className="result-breakdown-summary">
                  <span>
                    <strong>{assessment.instrument}</strong>
                    <small>
                      {assessment.applied_on ? `Aplicada em ${formatDate(assessment.applied_on)}` : 'Data não informada'}
                      {assessment.application_form ? ` · ${assessment.application_form}` : ''}
                    </small>
                  </span>
                  <span className="result-breakdown-meta">
                    {assessment.protocol_validity ? <Badge tone="info">{assessment.protocol_validity}</Badge> : null}
                    <Badge tone="success">Compartilhada</Badge>
                  </span>
                </div>

                {assessment.results?.summary ? (
                  <p className="patient-personality-summary">{assessment.results.summary}</p>
                ) : null}

                {assessment.results?.domains?.length ? (
                  <div className="personality-domain-grid patient-domain-grid">
                    {assessment.results.domains.map((domain) => (
                      <div key={`${assessment.id}-${domain.domain}`}>
                        <span>{domain.domain}</span>
                        <strong>{scoreLabel(domain.score)}</strong>
                        <small>{domain.classification ?? 'Sem classificação'}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="chart-empty">Nenhum domínio visível nesta avaliação.</p>
                )}
              </article>
            ))}
          </section>
        ) : (
          <EmptyState
            icon={LockKeyhole}
            title="Nenhuma avaliação liberada"
            description="Quando seu psicólogo compartilhar uma avaliação de personalidade, ela aparecerá aqui."
          />
        )}
      </DataState>
    </div>
  )
}
