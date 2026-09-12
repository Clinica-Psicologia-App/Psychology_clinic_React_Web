import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, FileSearch, LockKeyhole, Mail, Phone, ShieldCheck, UserRoundCheck, Users } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { CapacityCell } from '../components/design-system/CapacityCell'
import { MonthlyResponsesChart } from '../components/charts/MonthlyResponsesChart'
import { Badge, ChartPanel, DataState, EntityHeader, PageHeader, StatCard, StatusBadge } from '../components/Ui'
import { useAuth } from '../context/auth'
import { formatDate } from '../lib/format'
import { isPlatformAdminScope } from '../lib/roleAccess'
import { getPsychologistDetail } from '../services/supabaseQueries'

function percent(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    insert: 'Criação',
    update: 'Atualização',
    delete: 'Exclusão',
    questionnaire_publish: 'Publicação',
    questionnaire_archive: 'Arquivamento',
    questionnaire_duplicate: 'Duplicação',
  }
  return labels[action] ?? action
}

export function PsychologistDetailPage() {
  const { profile } = useAuth()
  const { userId } = useParams()
  const platformScope = isPlatformAdminScope(profile)
  const { data, isLoading, error } = useQuery({
    queryKey: ['psychologist-detail', userId],
    queryFn: () => getPsychologistDetail(userId!),
    enabled: Boolean(userId),
  })

  const completionRate = data ? percent(data.totals.completedResponses, data.totals.responses) : 0
  const limit = data?.psychologist.patient_assignment_limit ?? null
  const activePatients = platformScope ? [] : data?.patients.filter((patient) => patient.is_active).slice(0, 10) ?? []
  const inactivePatients = data?.patients.filter((patient) => !patient.is_active).length ?? 0
  const topQuestionnaires = data?.questionnaireRows.slice(0, 8) ?? []

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operação"
        title={data?.psychologist.full_name ?? 'Psicólogo'}
        description="Carga de pacientes, limites, questionários liberados e produção vinculada."
        action={
          <Link to="/usuarios">
            <Button variant="ghost"><ArrowLeft size={16} aria-hidden="true" /> Voltar para usuários</Button>
          </Link>
        }
      />

      <DataState loading={isLoading} error={error}>
        {data ? (
          <>
            <EntityHeader
              avatar={data.psychologist.full_name}
              title={data.psychologist.full_name}
              subtitle={`${data.clinic?.name ?? 'Sem clínica'} · CRP ${data.psychologist.crp || 'não informado'}`}
              badges={
                <>
                  <StatusBadge active={data.psychologist.is_active} />
                  <Badge tone={data.psychologist.can_receive_patients === false ? 'danger' : 'success'}>
                    {data.psychologist.can_receive_patients === false ? 'Novos pacientes bloqueados' : 'Pode receber pacientes'}
                  </Badge>
                  <Badge tone="neutral">Criado em {formatDate(data.psychologist.created_at)}</Badge>
                  {data.clinic ? <Link to={`/clinicas/${data.clinic.id}`}><Badge tone="info">{data.clinic.name}</Badge></Link> : null}
                </>
              }
              contacts={[
                { icon: Mail, value: data.psychologist.email },
                { icon: Phone, value: data.psychologist.phone || 'Sem telefone' },
              ]}
            />

            <section className="stats-grid four">
              <StatCard
                label="Capacidade"
                value={limit != null ? `${data.totals.capacityUsed}/${limit}` : `${data.totals.capacityUsed}`}
                icon={ShieldCheck}
                detail={`${data.totals.pendingInvitations} convites pendentes`}
              />
              <StatCard label="Pacientes ativos" value={`${data.totals.activePatients}/${data.totals.patients}`} icon={UserRoundCheck} tone="blue" detail={`${inactivePatients} inativos`} />
              <StatCard label="Respostas" value={data.totals.responses} icon={ClipboardList} tone="violet" detail={`${completionRate}% concluídas`} />
              <StatCard label="Questionários liberados" value={data.totals.questionnaireAccess} icon={FileSearch} tone="navy" detail={`${topQuestionnaires.length} em uso`} />
            </section>

            <article className="panel capacity-summary-panel">
              <div className="panel-header">
                <div><h2>Limite de pacientes</h2><p>Utilização da capacidade configurada para este profissional.</p></div>
              </div>
              <CapacityCell
                used={data.totals.capacityUsed ?? 0}
                limit={limit}
                canReceive={data.psychologist.can_receive_patients !== false}
              />
            </article>

            <section className="detail-grid">
              <MonthlyResponsesChart
                data={data.monthlyResponses}
                title="Produção mensal"
                description="Respostas dos pacientes vinculados ao psicólogo."
              />

              <ChartPanel title="Auditoria do profissional" description="Últimas ações registradas por este perfil." icon={FileSearch}>
                <div className="executive-list compact-list">
                  {data.auditEvents.slice(0, 6).map((event) => (
                    <div key={event.id}>
                      <strong>{actionLabel(event.action)} em {event.entity_type}</strong>
                      <span>{formatDateTime(event.occurred_at)}</span>
                    </div>
                  ))}
                  {!data.auditEvents.length ? <p className="chart-empty">Nenhum evento de auditoria encontrado.</p> : null}
                </div>
              </ChartPanel>
            </section>

            <section className="detail-tables-grid">
              {platformScope ? (
                <article className="panel report-table-panel">
                  <div className="panel-header">
                    <div><h2>Pacientes ativos</h2><p>Dados individuais protegidos neste escopo.</p></div>
                    <LockKeyhole size={20} aria-hidden="true" />
                  </div>
                  <div className="empty">O escopo de plataforma acompanha capacidade e volume, sem abrir dados nominais dos pacientes.</div>
                </article>
              ) : (
                <article className="panel report-table-panel">
                  <div className="panel-header">
                    <div><h2>Pacientes ativos</h2><p>Pacientes sob responsabilidade do profissional.</p></div>
                    <Users size={20} aria-hidden="true" />
                  </div>
                  <div className="table-card compact-table report-table detail-table">
                    <table>
                      <thead><tr><th>Paciente</th><th>Status</th><th>Criado em</th><th>Contato</th></tr></thead>
                      <tbody>
                        {activePatients.map((patient) => (
                          <tr key={patient.id}>
                            <td>
                              <strong><Link to={`/pacientes/${patient.id}`}>{patient.full_name}</Link></strong>
                              <small>{patient.email ?? 'Sem e-mail'}</small>
                            </td>
                            <td><StatusBadge active={patient.is_active} /></td>
                            <td>{formatDate(patient.created_at)}</td>
                            <td>{patient.phone || 'Sem telefone'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!activePatients.length ? <div className="empty">Nenhum paciente ativo vinculado.</div> : null}
                  </div>
                </article>
              )}

              <article className="panel report-table-panel">
                <div className="panel-header">
                  <div><h2>Questionários</h2><p>Instrumentos liberados ou respondidos pelos pacientes.</p></div>
                  <ClipboardList size={20} aria-hidden="true" />
                </div>
                <div className="table-card compact-table report-table detail-table">
                  <table>
                    <thead><tr><th>Instrumento</th><th>Status</th><th>Respostas</th><th>Taxa</th></tr></thead>
                    <tbody>
                      {topQuestionnaires.map((questionnaire) => (
                        <tr key={questionnaire.id}>
                          <td><strong>{questionnaire.name}</strong><small>{questionnaire.code}</small></td>
                          <td><Badge tone={questionnaire.is_active ? 'success' : 'neutral'}>{questionnaire.clinical_status}</Badge></td>
                          <td>{questionnaire.completedResponses}/{questionnaire.responses}</td>
                          <td>{questionnaire.completionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!topQuestionnaires.length ? <div className="empty">Nenhum questionário liberado ou respondido.</div> : null}
                </div>
              </article>
            </section>
          </>
        ) : null}
      </DataState>
    </div>
  )
}
