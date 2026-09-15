import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Brain, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { formatDate } from '../lib/format'
import { listPatientPortalPersonalityAssessments } from '../services/supabaseQueries'

function scoreLabel(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
}

function domainBarColor(score?: number | null) {
  if (score == null) return 'var(--text-muted)'
  if (score >= 80) return 'var(--color-brand-blue)'
  if (score >= 60) return 'var(--green)'
  if (score >= 40) return 'var(--yellow)'
  return 'var(--red)'
}

function normalizeScore(score?: number | null, domains?: Array<{ score?: number | null }>) {
  if (score == null) return 0
  const max = Math.max(...(domains ?? []).map((d) => d.score ?? 0), 1)
  return Math.round((score / max) * 100)
}

export function PatientPersonalityPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
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
        action={
          <Link to="/referencias-modos">
            <Button variant="secondary" size="sm"><BookOpen size={16} aria-hidden="true" /> Sobre os modos</Button>
          </Link>
        }
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
            {assessments.map((assessment) => {
              const isExpanded = expandedId === assessment.id
              const domains = assessment.results?.domains ?? []
              const patientSummary = (assessment as { clinical_synthesis?: { patient_summary?: string | null } | null }).clinical_synthesis?.patient_summary
              const schemaLinks = (assessment as { conceptualization_integration?: { schema_links?: string[] | null; mode_links?: string[] | null } | null }).conceptualization_integration

              return (
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

                  {patientSummary ? (
                    <div className="personality-synthesis-block">
                      <strong>Interpretação</strong>
                      <p>{patientSummary}</p>
                    </div>
                  ) : assessment.results?.summary ? (
                    <p className="patient-personality-summary">{assessment.results.summary}</p>
                  ) : null}

                  {domains.length ? (
                    <>
                      <div className="personality-chart-section">
                        <button
                          className="personality-chart-toggle"
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? 'Ocultar gráfico de domínios' : 'Ver gráfico de domínios'}
                        </button>

                        {isExpanded ? (
                          <div className="personality-bar-chart">
                            {domains.map((domain) => (
                              <div className="personality-bar-row" key={domain.domain}>
                                <span className="personality-bar-label">{domain.domain}</span>
                                <div className="personality-bar-track">
                                  <div
                                    className="personality-bar-fill"
                                    style={{
                                      width: `${normalizeScore(domain.score, domains)}%`,
                                      background: domainBarColor(domain.score),
                                    }}
                                  />
                                </div>
                                <span className="personality-bar-value">{scoreLabel(domain.score)}</span>
                                {domain.classification ? <span className="personality-bar-class">{domain.classification}</span> : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="personality-domain-grid patient-domain-grid">
                        {domains.map((domain) => (
                          <div key={`${assessment.id}-${domain.domain}`}>
                            <span>{domain.domain}</span>
                            <strong>{scoreLabel(domain.score)}</strong>
                            <small>{domain.classification ?? 'Sem classificação'}</small>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="chart-empty">Nenhum domínio visível nesta avaliação.</p>
                  )}

                  {(schemaLinks?.schema_links?.length || schemaLinks?.mode_links?.length) ? (
                    <div className="personality-links-row">
                      {schemaLinks?.schema_links?.map((link) => (
                        <Badge key={link} tone="info">{link}</Badge>
                      ))}
                      {schemaLinks?.mode_links?.map((link) => (
                        <Badge key={link} tone="neutral">{link}</Badge>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })}
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
