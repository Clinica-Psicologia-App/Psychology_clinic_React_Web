import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowRight, BellRing, Building2, ClipboardList, FileSearch, ShieldCheck, TrendingUp, Users, UserRoundCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../components/design-system/Button'
import { ChartPanel, EmptyChartState } from '../components/design-system/ChartPanel'
import { DataState, PageHeader, StatCard } from '../components/Ui'
import { chartColor, chartTheme } from '../components/charts/chartTheme'
import { getAdvancedReportsData } from '../services/supabaseQueries'

function percent(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function plural(value: number, singular: string, pluralText: string) {
  return `${value} ${value === 1 ? singular : pluralText}`
}

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['dashboard-executive'], queryFn: getAdvancedReportsData })

  const totals = data?.totals
  const activationRate = totals ? percent(totals.activePatients, totals.patients) : 0
  const clinicActivationRate = totals ? percent(totals.activeClinics, totals.clinics) : 0
  const topClinics = data?.clinicRows.slice(0, 5) ?? []
  const topPsychologists = data?.psychologistRows.slice(0, 5) ?? []
  const questionnaireUse = data?.questionnaireRows.slice(0, 5) ?? []
  const responseStatusData = data?.responseStatusRows.map((row) => ({
    name: row.status === 'completed' ? 'Concluídas' : row.status === 'draft' ? 'Em andamento' : row.status === 'cancelled' ? 'Canceladas' : row.status,
    value: row.count,
  })) ?? []
  const overloadedPsychologists = data?.psychologistRows.filter((row) => row.patient_assignment_limit != null && row.activePatients >= row.patient_assignment_limit).slice(0, 3) ?? []
  const operationalAlerts = [
    totals?.pendingInvitations
      ? { tone: 'danger', title: `${totals.pendingInvitations} convites pendentes`, detail: 'Convites parados podem atrasar entrada do paciente no app.', to: '/usuarios' }
      : null,
    totals?.draftResponses
      ? { tone: 'warning', title: `${totals.draftResponses} respostas em andamento`, detail: 'Acompanhe instrumentos iniciados que ainda não foram concluídos.', to: '/relatorios' }
      : null,
    (totals?.responseCompletionRate ?? 100) < 70
      ? { tone: 'warning', title: `Conclusão em ${totals?.responseCompletionRate ?? 0}%`, detail: 'Taxa de conclusão abaixo do alvo operacional.', to: '/relatorios' }
      : null,
    overloadedPsychologists.length
      ? { tone: 'info', title: `${overloadedPsychologists.length} psicólogo(s) no limite`, detail: overloadedPsychologists.map((row) => row.name).join(', '), to: '/usuarios' }
      : null,
  ].filter(Boolean) as Array<{ tone: string; title: string; detail: string; to: string }>

  const insights = [
    totals?.pendingInvitations
      ? { problem: `${totals.pendingInvitations} convites pendentes`, action: 'Revisar usuários e pacientes', to: '/usuarios' }
      : null,
    totals?.draftResponses
      ? { problem: `${totals.draftResponses} respostas em andamento`, action: 'Ver relatórios de uso', to: '/relatorios' }
      : null,
    clinicActivationRate < 100
      ? { problem: 'Há clínicas inativas ou em configuração', action: 'Gerenciar clínicas', to: '/clinicas' }
      : null,
    totals?.responseCompletionRate
      ? { problem: `Taxa de conclusão em ${totals.responseCompletionRate}%`, action: 'Abrir relatórios', to: '/relatorios' }
      : null,
  ].filter(Boolean) as Array<{ problem: string; action: string; to: string }>

  const actionCards = [
    { to: '/clinicas', label: 'Gerenciar clínicas', detail: 'Cadastro, status e organização', icon: Building2 },
    { to: '/usuarios', label: 'Gerenciar usuários', detail: 'Admins, psicólogos e limites', icon: Users },
    { to: '/questionarios', label: 'Catálogo clínico', detail: 'Criar, publicar e arquivar', icon: ClipboardList },
    { to: '/auditoria', label: 'Ver auditoria', detail: 'Ações sensíveis e rastreio', icon: FileSearch },
  ]

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Visão executiva"
        title="Dashboard da plataforma"
        description="Saúde operacional, tendências e pontos que exigem atenção."
        action={
          <Link to="/relatorios">
            <Button variant="secondary"><TrendingUp size={16} aria-hidden="true" /> Abrir relatórios</Button>
          </Link>
        }
      />

      <DataState loading={isLoading} error={error} onRetry={() => refetch()}>
        <section className="dashboard-hero-panel panel">
          <div className="dashboard-health-summary">
            <div>
              <span className="eyebrow">Saúde da operação</span>
              <h2>{activationRate}% dos pacientes estão ativos</h2>
              <p>{plural(totals?.activePatients ?? 0, 'paciente ativo', 'pacientes ativos')} em {plural(totals?.clinics ?? 0, 'clínica cadastrada', 'clínicas cadastradas')}.</p>
            </div>
            <div className="health-orbit" style={{ background: `conic-gradient(var(--color-brand-accent) ${activationRate * 3.6}deg, var(--bg-muted) 0deg)` }} aria-label={`${activationRate}% de pacientes ativos`}>
              <div><strong>{activationRate}%</strong><span>ativação</span></div>
            </div>
          </div>
          <div className="dashboard-health-grid">
            <div><span>Clínicas ativas</span><strong>{clinicActivationRate}%</strong></div>
            <div><span>Conclusão de respostas</span><strong>{totals?.responseCompletionRate ?? 0}%</strong></div>
            <div><span>Convites pendentes</span><strong>{totals?.pendingInvitations ?? 0}</strong></div>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="Clínicas" value={totals?.clinics ?? 0} icon={Building2} detail={`${totals?.activeClinics ?? 0} ativas`} />
          <StatCard label="Psicólogos" value={totals?.psychologists ?? 0} icon={Users} tone="blue" detail={`${totals?.users ?? 0} usuários staff`} />
          <StatCard label="Pacientes" value={totals?.patients ?? 0} icon={UserRoundCheck} tone="violet" detail={`${totals?.activePatients ?? 0} ativos`} />
          <StatCard label="Questionários" value={totals?.questionnaires ?? 0} icon={ClipboardList} tone="navy" detail={`${totals?.responses ?? 0} respostas`} />
        </section>

        <section className="dashboard-alert-board">
          <article className="dashboard-alert-lead">
            <BellRing size={22} aria-hidden="true" />
            <div>
              <span className="eyebrow">Alertas da home</span>
              <strong>{operationalAlerts.length ? `${operationalAlerts.length} pontos de atenção` : 'Operação sem alertas críticos'}</strong>
              <p>Monitore convites, respostas, conclusão e capacidade dos profissionais.</p>
            </div>
          </article>
          {operationalAlerts.length ? operationalAlerts.map((alert) => (
            <Link className={`dashboard-alert-card ${alert.tone}`} to={alert.to} key={alert.title}>
              <AlertTriangle size={18} aria-hidden="true" />
              <span><strong>{alert.title}</strong><small>{alert.detail}</small></span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )) : (
            <article className="dashboard-alert-card success">
              <ShieldCheck size={18} aria-hidden="true" />
              <span><strong>Nenhuma ação imediata</strong><small>Os principais indicadores estão dentro do esperado.</small></span>
            </article>
          )}
        </section>

        <section className="dashboard-executive-grid">
          <ChartPanel title="Uso dos questionários" description="Respostas criadas e concluídas — últimos 12 meses" icon={Activity}>
            {(data?.monthlyResponses?.length ?? 0) > 0 ? (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.monthlyResponses ?? []} margin={chartTheme.margins}>
                    <CartesianGrid {...chartTheme.grid} />
                    <XAxis dataKey="label" {...chartTheme.axis} />
                    <YAxis {...chartTheme.axis} allowDecimals={false} />
                    <Tooltip {...chartTheme.tooltip} />
                    <Bar dataKey="responses" name="Respostas" fill={chartColor(1)} radius={chartTheme.barRadius} />
                    <Bar dataKey="completed" name="Concluídas" fill={chartColor(0)} radius={chartTheme.barRadius} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChartState />}
          </ChartPanel>

          <ChartPanel title="Respostas por status" description="Distribuição do ciclo atual" icon={Activity}>
            {responseStatusData.length > 0 ? (
              <>
                <div className="chart-box compact">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={responseStatusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3}>
                        {responseStatusData.map((_, index) => <Cell key={index} fill={chartColor(index)} />)}
                      </Pie>
                      <Tooltip {...chartTheme.tooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="legend-list">
                  {responseStatusData.map((row, index) => (
                    <span key={row.name}><i style={{ background: chartColor(index) }} /> {row.name}: <strong>{row.value}</strong></span>
                  ))}
                </div>
              </>
            ) : <EmptyChartState message="Nenhuma resposta registrada ainda." />}
          </ChartPanel>
        </section>

        <section className="dashboard-lists-grid">
          <article className="panel executive-list-panel">
            <div className="panel-header"><div><h2>Clínicas prioritárias</h2><p>Maior volume de pacientes ativos.</p></div></div>
            <div className="executive-list">
              {topClinics.map((clinic) => <div key={clinic.id}><strong>{clinic.name}</strong><span>{clinic.activePatients}/{clinic.patients} pacientes ativos • {clinic.responses} respostas</span></div>)}
              {!topClinics.length ? <p>Nenhuma clínica cadastrada.</p> : null}
            </div>
          </article>

          <article className="panel executive-list-panel">
            <div className="panel-header"><div><h2>Carga por psicólogo</h2><p>Profissionais com mais pacientes ativos.</p></div></div>
            <div className="executive-list">
              {topPsychologists.map((psychologist) => <div key={psychologist.id}><strong>{psychologist.name}</strong><span>{psychologist.activePatients} ativos • limite {psychologist.patient_assignment_limit ?? 'sem limite'} • {psychologist.clinicName}</span></div>)}
              {!topPsychologists.length ? <p>Nenhum psicólogo cadastrado.</p> : null}
            </div>
          </article>

          <article className="panel executive-list-panel">
            <div className="panel-header"><div><h2>Instrumentos mais usados</h2><p>Questionários por volume de respostas.</p></div></div>
            <div className="executive-list">
              {questionnaireUse.map((questionnaire) => <div key={questionnaire.id}><strong>{questionnaire.name}</strong><span>{questionnaire.responses} respostas • {questionnaire.completionRate}% concluídas</span></div>)}
              {!questionnaireUse.length ? <p>Nenhum questionário cadastrado.</p> : null}
            </div>
          </article>
        </section>

        <section className="quick-actions-grid">
          {actionCards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.to} className="quick-action-card" to={card.to}>
                <Icon size={20} aria-hidden="true" />
                <div><strong>{card.label}</strong><span>{card.detail}</span></div>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )
          })}
        </section>

        <article className="panel insight-panel production-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Ações recomendadas</span>
              <h2>O que observar hoje</h2>
            </div>
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          {insights.length ? (
            <ul className="insight-list insight-action-list">
              {insights.map((item) => (
                <li key={item.problem}>
                  <strong>{item.problem}</strong>
                  <span>→ <Link to={item.to}>{item.action}</Link></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="insight-empty">Nenhum alerta operacional relevante no momento.</p>
          )}
        </article>
      </DataState>
    </div>
  )
}
