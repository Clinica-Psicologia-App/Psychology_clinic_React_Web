import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ClipboardList, FileSearch, HeartPulse, LockKeyhole, Mail, Phone, Printer, Target, UserRoundCheck, Users } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { MonthlyResponsesChart } from '../components/charts/MonthlyResponsesChart'
import { Badge, ChartPanel, DataState, EmptyState, EntityHeader, PageHeader, StatCard, StatusBadge } from '../components/Ui'
import { useAuth } from '../context/auth'
import { formatDate } from '../lib/format'
import { isPlatformAdminScope } from '../lib/roleAccess'
import { getPatientDetail } from '../services/supabaseQueries'
import { ClinicalIntelligence } from '../components/clinical/ClinicalIntelligence'
import { PatientQuestionnaireManager } from '../components/clinical/PatientQuestionnaireManager'
import { PatientResultsReleasePanel } from '../components/clinical/PatientResultsReleasePanel'
import { PatientResultsBreakdown } from '../components/clinical/PatientResultsBreakdown'
import { PatientGoalsManager } from '../components/clinical/PatientGoalsManager'
import { PatientProblemsManager } from '../components/clinical/PatientProblemsManager'
import { PatientTimelineManager } from '../components/clinical/PatientTimelineManager'
import { PatientInitialAssessmentManager } from '../components/clinical/PatientInitialAssessmentManager'
import { PatientInitialAssessmentPanel } from '../components/clinical/PatientInitialAssessmentPanel'
import { PatientMentalMapSummary } from '../components/clinical/PatientMentalMapSummary'
import { PatientLibraryManager } from '../components/clinical/PatientLibraryManager'
import { PatientGenogramManager } from '../components/clinical/PatientGenogramManager'
import { PatientFamilyContextPanel } from '../components/clinical/PatientFamilyContextPanel'
import { PatientSchemaActivationsPanel } from '../components/clinical/PatientSchemaActivationsPanel'
import { PatientCaseConceptualizationManager } from '../components/clinical/PatientCaseConceptualizationManager'
import { PatientClinicalHypothesesPanel } from '../components/clinical/PatientClinicalHypothesesPanel'
import { PatientCompletenessPanel } from '../components/clinical/PatientCompletenessPanel'
import { PatientInfographicPanel } from '../components/clinical/PatientInfographicPanel'
import { PatientPersonalityManager } from '../components/clinical/PatientPersonalityManager'
import { PatientClinicalReportPanel } from '../components/clinical/PatientClinicalReportPanel'
import { PatientScoreEvolutionPanel } from '../components/clinical/PatientScoreEvolutionPanel'
import { PatientMonitoringPanel } from '../components/clinical/PatientMonitoringPanel'

function percent(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function responseStatusTone(status: string): 'success' | 'danger' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'neutral'
}

function responseStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Em andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  }
  return labels[status] ?? status
}

function yesNo(value?: boolean | null) {
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  return 'Não informado'
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    insert: 'Criação',
    update: 'Atualização',
    delete: 'Exclusão',
  }
  return labels[action] ?? action
}

export function PatientDetailPage() {
  const { profile } = useAuth()
  const { patientId } = useParams()
  const platformScope = isPlatformAdminScope(profile)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['patient-detail', patientId],
    queryFn: () => getPatientDetail(patientId!),
    enabled: Boolean(patientId) && !platformScope,
  })

  if (platformScope) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Privacidade clínica"
          title="Ficha individual protegida"
          description="Administradores de plataforma acompanham pacientes somente por visão agregada."
          action={
            <Link to="/visao-pacientes">
              <Button variant="ghost"><ArrowLeft size={16} aria-hidden="true" /> Voltar para visão agregada</Button>
            </Link>
          }
        />
        <EmptyState
          icon={LockKeyhole}
          title="Dados individuais não disponíveis neste escopo"
          description="Esta restrição preserva a separação entre governança da plataforma e prontuário clínico."
        />
      </div>
    )
  }

  const completionRate = data ? percent(data.totals.completedResponses, data.totals.responses) : 0
  const latestResponses = data?.responses.slice(0, 10) ?? []
  const latestAudit = data?.auditEvents.slice(0, 8) ?? []

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operação"
        title={data?.patient.full_name ?? 'Paciente'}
        description="Dados cadastrais, vínculo clínico, respostas e auditoria."
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => window.print()}>
              <Printer size={16} aria-hidden="true" /> Imprimir prontuário
            </Button>
            <Link to="/pacientes">
              <Button variant="ghost"><ArrowLeft size={16} aria-hidden="true" /> Voltar para pacientes</Button>
            </Link>
          </div>
        }
      />

      <DataState loading={isLoading} error={error}>
        {data ? (
          <>
            <EntityHeader
              avatar={data.patient.full_name}
              title={data.patient.full_name}
              subtitle={`${data.clinic?.name ?? 'Sem clínica'} · ${data.psychologist?.full_name ?? 'Sem psicólogo responsável'}`}
              badges={
                <>
                  <StatusBadge active={data.patient.is_active} />
                  <Badge tone={data.patient.profile_id ? 'success' : 'neutral'}>
                    {data.patient.profile_id ? 'Com acesso ao app' : 'Sem acesso ao app'}
                  </Badge>
                  <Badge tone="neutral">Criado em {formatDate(data.patient.created_at)}</Badge>
                </>
              }
              contacts={[
                { icon: Mail, value: data.patient.email || 'Sem e-mail' },
                { icon: Phone, value: data.patient.phone || 'Sem telefone' },
              ]}
            />

            <section className="stats-grid four">
              <StatCard label="Questionários" value={data.totals.responses} icon={ClipboardList} detail={`${completionRate}% concluídos`} />
              <StatCard label="Plano clínico" value={`${data.totals.activeProblems}/${data.totals.activeGoals}`} icon={Target} tone="blue" detail="Problemas ativos / metas ativas" />
              <StatCard label="Check-ins" value={data.totals.checkIns} icon={HeartPulse} tone="violet" detail={`${data.totals.dailyMonitors} monitoramentos`} />
              <StatCard label="Auditoria" value={data.totals.auditEvents} icon={FileSearch} tone="navy" detail="Eventos relacionados" />
            </section>

            <PatientCompletenessPanel data={data} />

            <PatientInfographicPanel data={data} />

            <PatientClinicalReportPanel data={data} />

            <ClinicalIntelligence data={data} onChanged={() => refetch()} />

            <PatientInitialAssessmentManager data={data} onChanged={() => refetch()} />

            <PatientInitialAssessmentPanel data={data} />

            <PatientMentalMapSummary data={data} />

            <PatientGenogramManager data={data} />

            <PatientFamilyContextPanel data={data} />

            <PatientCaseConceptualizationManager data={data} />

            <PatientClinicalHypothesesPanel data={data} />

            <PatientPersonalityManager data={data} />

            <PatientProblemsManager data={data} onChanged={() => refetch()} />

            <PatientGoalsManager data={data} onChanged={() => refetch()} />

            <PatientTimelineManager data={data} onChanged={() => refetch()} />

            <PatientLibraryManager data={data} />

            <PatientQuestionnaireManager data={data} onChanged={() => refetch()} />

            <PatientResultsReleasePanel data={data} onChanged={() => refetch()} />

            <PatientResultsBreakdown data={data} />

            <PatientSchemaActivationsPanel data={data} />

            <PatientMonitoringPanel data={data} />

            <section className="detail-grid">
              <PatientScoreEvolutionPanel data={data} />
              <MonthlyResponsesChart
                data={data.monthlyResponses}
                title="Respostas ao longo do tempo"
                description="Questionários criados e concluídos nos últimos 12 meses."
              />

              <ChartPanel title="Perfil cadastral" description="Dados informados no cadastro do paciente." icon={UserRoundCheck}>
                <div className="profile-kv-grid">
                  <div><span>CPF</span><strong>{data.patient.cpf || 'Não informado'}</strong></div>
                  <div><span>Nascimento</span><strong>{data.patient.birth_date ? formatDate(data.patient.birth_date) : 'Não informado'}</strong></div>
                  <div><span>Gênero</span><strong>{data.patient.gender || 'Não informado'}</strong></div>
                  <div><span>Estado civil</span><strong>{data.patient.relationship_status || 'Não informado'}</strong></div>
                  <div><span>Escolaridade</span><strong>{data.patient.education_level || 'Não informado'}</strong></div>
                  <div><span>Ocupação</span><strong>{data.patient.occupation || 'Não informado'}</strong></div>
                  <div><span>Tem filhos</span><strong>{yesNo(data.patient.has_children)}</strong></div>
                  <div><span>Inativado em</span><strong>{data.patient.inactivated_at ? formatDate(data.patient.inactivated_at) : 'Não'}</strong></div>
                </div>
              </ChartPanel>
            </section>

            <section className="detail-tables-grid">
              <article className="panel report-table-panel">
                <div className="panel-header">
                  <div><h2>Respostas recentes</h2><p>Questionários respondidos ou em andamento.</p></div>
                  <ClipboardList size={20} aria-hidden="true" />
                </div>
                <div className="table-card compact-table report-table detail-table">
                  <table>
                    <thead><tr><th>Questionário</th><th>Status</th><th>Criado em</th><th>Concluído em</th></tr></thead>
                    <tbody>
                      {latestResponses.map((response) => (
                        <tr key={response.id}>
                          <td><strong>{response.questionnaire_name}</strong><small>{response.questionnaire_code}</small></td>
                          <td><Badge tone={responseStatusTone(response.status)}>{responseStatusLabel(response.status)}</Badge></td>
                          <td>{formatDateTime(response.created_at)}</td>
                          <td>{response.completed_at ? formatDateTime(response.completed_at) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!latestResponses.length ? <div className="empty">Nenhuma resposta registrada para este paciente.</div> : null}
                </div>
              </article>

              <ChartPanel title="Auditoria relacionada" description="Eventos sensíveis vinculados ao paciente." icon={FileSearch}>
                <div className="executive-list compact-list">
                  {latestAudit.map((event) => (
                    <div key={event.id}>
                      <strong>{actionLabel(event.action)} em {event.entity_type}</strong>
                      <span>{event.actor_name} · {formatDateTime(event.occurred_at)}</span>
                    </div>
                  ))}
                  {!latestAudit.length ? <p className="chart-empty">Nenhum evento de auditoria encontrado.</p> : null}
                </div>
              </ChartPanel>
            </section>

            <article className="panel">
              <div className="panel-header">
                <div><h2>Vínculos operacionais</h2><p>Navegue para os registros relacionados.</p></div>
                <Users size={20} aria-hidden="true" />
              </div>
              <div className="quick-actions-grid patient-actions-grid">
                {data.clinic ? (
                  <Link className="quick-action-card" to={`/clinicas/${data.clinic.id}`}>
                    <CalendarDays size={22} aria-hidden="true" />
                    <div><strong>Clínica</strong><span>{data.clinic.name}</span></div>
                  </Link>
                ) : null}
                {data.psychologist ? (
                  <Link className="quick-action-card" to={`/usuarios/${data.psychologist.id}`}>
                    <Users size={22} aria-hidden="true" />
                    <div><strong>Psicólogo</strong><span>{data.psychologist.full_name}</span></div>
                  </Link>
                ) : null}
              </div>
            </article>
          </>
        ) : null}
      </DataState>
    </div>
  )
}
