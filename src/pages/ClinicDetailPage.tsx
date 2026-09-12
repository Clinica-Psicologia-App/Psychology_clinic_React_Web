import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, ClipboardList, FileSearch, LockKeyhole, Mail, Phone, UserRoundCheck, Users } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { CapacityCell } from '../components/design-system/CapacityCell'
import { MonthlyResponsesChart } from '../components/charts/MonthlyResponsesChart'
import { Badge, ChartPanel, DataState, EntityHeader, PageHeader, StatCard, StatusBadge } from '../components/Ui'
import { useAuth } from '../context/auth'
import { formatDate } from '../lib/format'
import { isPlatformAdminScope } from '../lib/roleAccess'
import { getClinicDetail } from '../services/supabaseQueries'

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

export function ClinicDetailPage() {
  const { profile } = useAuth()
  const { clinicId } = useParams()
  const platformScope = isPlatformAdminScope(profile)
  const { data, isLoading, error } = useQuery({
    queryKey: ['clinic-detail', clinicId],
    queryFn: () => getClinicDetail(clinicId!),
    enabled: Boolean(clinicId),
  })

  const activationRate = data ? percent(data.totals.activePatients, data.totals.patients) : 0
  const completionRate = data ? percent(data.totals.completedResponses, data.totals.responses) : 0
  const psychologists = data?.users.filter((user) => user.role === 'psychologist') ?? []
  const activePatients = platformScope ? [] : data?.patients.filter((patient) => patient.is_active).slice(0, 8) ?? []
  const topQuestionnaires = data?.questionnaireRows.slice(0, 6) ?? []

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operação"
        title={data?.clinic.name ?? 'Clínica'}
        description="Visão consolidada da operação, profissionais, pacientes e instrumentos."
        action={
          <Link to="/clinicas">
            <Button variant="ghost"><ArrowLeft size={16} aria-hidden="true" /> Voltar para clínicas</Button>
          </Link>
        }
      />

      <DataState loading={isLoading} error={error}>
        {data ? (
          <>
            <EntityHeader
              icon={Building2}
              title={data.clinic.name}
              subtitle={`${data.clinic.clinic_type === 'personal' ? 'Clínica individual' : 'Clínica'} · cadastrada em ${formatDate(data.clinic.created_at)}`}
              badges={
                <>
                  <StatusBadge active={data.clinic.is_active} />
                  <Badge tone="neutral">{data.clinic.document || 'Sem documento'}</Badge>
                  <Badge tone="neutral">Atualizada em {formatDate(data.clinic.updated_at ?? data.clinic.created_at)}</Badge>
                </>
              }
              contacts={[
                { icon: Mail, value: data.clinic.email || 'Sem e-mail' },
                { icon: Phone, value: data.clinic.phone || 'Sem telefone' },
              ]}
            />

            <section className="stats-grid four">
              <StatCard label="Pacientes ativos" value={`${data.totals.activePatients}/${data.totals.patients}`} icon={UserRoundCheck} detail={`${activationRate}% ativos`} />
              <StatCard label="Psicólogos" value={data.totals.psychologists} icon={Users} tone="blue" detail={`${data.totals.users} usuários staff`} />
              <StatCard label="Respostas" value={data.totals.responses} icon={ClipboardList} tone="violet" detail={`${completionRate}% concluídas`} />
              <StatCard label="Questionários liberados" value={data.totals.questionnaireAccess} icon={FileSearch} tone="navy" detail={`${data.totals.pendingInvitations} convites pendentes`} />
            </section>

            <section className="detail-grid">
              <MonthlyResponsesChart
                data={data.monthlyResponses}
                title="Uso mensal"
                description="Respostas criadas e concluídas nos últimos 12 meses."
              />

              <ChartPanel title="Auditoria recente" description="Últimos eventos registrados nesta clínica." icon={FileSearch}>
                <div className="executive-list compact-list">
                  {data.auditEvents.slice(0, 6).map((event) => (
                    <div key={event.id}>
                      <strong>{actionLabel(event.action)} em {event.entity_type}</strong>
                      <span>{event.actor_name} · {formatDateTime(event.occurred_at)}</span>
                    </div>
                  ))}
                  {!data.auditEvents.length ? <p className="chart-empty">Nenhum evento de auditoria encontrado.</p> : null}
                </div>
              </ChartPanel>
            </section>

            <section className="detail-tables-grid">
              <article className="panel report-table-panel">
                <div className="panel-header">
                  <div><h2>Psicólogos</h2><p>Capacidade e carga de atendimento.</p></div>
                  <Users size={20} aria-hidden="true" />
                </div>
                <div className="table-card compact-table report-table detail-table">
                  <table>
                    <thead><tr><th>Profissional</th><th>Status</th><th>Capacidade</th><th>Recebe pacientes</th></tr></thead>
                    <tbody>
                      {psychologists.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <strong><Link to={`/usuarios/${user.id}`}>{user.full_name}</Link></strong>
                            <small>{user.email}</small>
                          </td>
                          <td><StatusBadge active={user.is_active} /></td>
                          <td>
                            <CapacityCell
                              used={user.assigned_patients_count ?? 0}
                              limit={user.patient_assignment_limit}
                              canReceive={user.can_receive_patients !== false}
                            />
                          </td>
                          <td>
                            <Badge tone={user.can_receive_patients === false ? 'danger' : 'success'}>
                              {user.can_receive_patients === false ? 'Bloqueado' : 'Liberado'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!psychologists.length ? <div className="empty">Nenhum psicólogo vinculado.</div> : null}
                </div>
              </article>

              {platformScope ? (
                <article className="panel report-table-panel">
                  <div className="panel-header">
                    <div><h2>Pacientes ativos</h2><p>Dados individuais protegidos neste escopo.</p></div>
                    <LockKeyhole size={20} aria-hidden="true" />
                  </div>
                  <div className="empty">Esta tela mostra apenas totais da clínica. Para acompanhamento sem identificação, use a visão agregada de pacientes.</div>
                </article>
              ) : (
                <article className="panel report-table-panel">
                  <div className="panel-header">
                    <div><h2>Pacientes ativos</h2><p>Amostra dos pacientes em acompanhamento.</p></div>
                    <UserRoundCheck size={20} aria-hidden="true" />
                  </div>
                  <div className="table-card compact-table report-table detail-table">
                    <table>
                      <thead><tr><th>Paciente</th><th>Responsável</th><th>Status</th><th>Criado em</th></tr></thead>
                      <tbody>
                        {activePatients.map((patient) => (
                          <tr key={patient.id}>
                            <td>
                              <strong><Link to={`/pacientes/${patient.id}`}>{patient.full_name}</Link></strong>
                              <small>{patient.email ?? 'Sem e-mail'}</small>
                            </td>
                            <td>{patient.responsible_psychologist?.full_name ?? 'Sem responsável'}</td>
                            <td><StatusBadge active={patient.is_active} /></td>
                            <td>{formatDate(patient.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!activePatients.length ? <div className="empty">Nenhum paciente ativo nesta clínica.</div> : null}
                  </div>
                </article>
              )}
            </section>

            <article className="panel report-table-panel">
              <div className="panel-header">
                <div><h2>Questionários na clínica</h2><p>Instrumentos com acesso liberado ou respostas registradas.</p></div>
                <ClipboardList size={20} aria-hidden="true" />
              </div>
              <div className="table-card compact-table report-table detail-table">
                <table>
                  <thead><tr><th>Instrumento</th><th>Status clínico</th><th>Respostas</th><th>Concluídas</th><th>Taxa</th></tr></thead>
                  <tbody>
                    {topQuestionnaires.map((questionnaire) => (
                      <tr key={questionnaire.id}>
                        <td><strong>{questionnaire.name}</strong><small>{questionnaire.code}</small></td>
                        <td><Badge tone={questionnaire.is_active ? 'success' : 'neutral'}>{questionnaire.clinical_status}</Badge></td>
                        <td>{questionnaire.responses}</td>
                        <td>{questionnaire.completedResponses}</td>
                        <td>{questionnaire.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!topQuestionnaires.length ? <div className="empty">Nenhum questionário liberado ou respondido nesta clínica.</div> : null}
              </div>
            </article>
          </>
        ) : null}
      </DataState>
    </div>
  )
}
