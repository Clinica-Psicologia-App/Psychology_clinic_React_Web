import { useQuery } from '@tanstack/react-query'
import { Activity, BarChart3, Building2, ClipboardList, Download, FileSpreadsheet, LineChart as LineChartIcon, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../components/design-system/Button'
import { ChartPanel, EmptyChartState } from '../components/design-system/ChartPanel'
import { Badge, DataState, PageHeader, StatCard } from '../components/Ui'
import { chartColor, chartTheme } from '../components/charts/chartTheme'
import { getAdvancedReportsData } from '../services/supabaseQueries'
import type { ReportClinicRow, ReportPsychologistRow, ReportQuestionnaireRow } from '../types'

type CsvValue = string | number | boolean | null | undefined

const statusLabels: Record<string, string> = {
  draft: 'Em andamento',
  completed: 'Concluídos',
  cancelled: 'Cancelados',
  sem_status: 'Sem status',
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value : 0}%`
}

function csvEscape(value: CsvValue) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, rows: Array<Record<string, CsvValue>>) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportClinics(rows: ReportClinicRow[]) {
  downloadCsv('relatorio-clinicas.csv', rows.map((row) => ({
    clinica: row.name,
    tipo: row.type,
    ativa: row.is_active ? 'sim' : 'nao',
    usuarios: row.users,
    psicologos: row.psychologists,
    pacientes: row.patients,
    pacientes_ativos: row.activePatients,
    respostas: row.responses,
    respostas_concluidas: row.completedResponses,
    convites_pendentes: row.pendingInvitations,
  })))
}

function exportPsychologists(rows: ReportPsychologistRow[]) {
  downloadCsv('relatorio-psicologos.csv', rows.map((row) => ({
    psicologo: row.name,
    email: row.email,
    clinica: row.clinicName,
    ativo: row.is_active ? 'sim' : 'nao',
    recebe_pacientes: row.can_receive_patients ? 'sim' : 'nao',
    limite_pacientes: row.patient_assignment_limit ?? 'sem limite',
    pacientes: row.patients,
    pacientes_ativos: row.activePatients,
    convites_pendentes: row.pendingInvitations,
    respostas: row.responses,
    respostas_concluidas: row.completedResponses,
  })))
}

function exportQuestionnaires(rows: ReportQuestionnaireRow[]) {
  downloadCsv('relatorio-questionarios.csv', rows.map((row) => ({
    codigo: row.code,
    questionario: row.name,
    status_clinico: row.clinical_status,
    ativo: row.is_active ? 'sim' : 'nao',
    respostas: row.responses,
    concluidas: row.completedResponses,
    em_andamento: row.draftResponses,
    canceladas: row.cancelledResponses,
    taxa_conclusao: `${row.completionRate}%`,
  })))
}

export function ReportsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['advanced-reports'], queryFn: getAdvancedReportsData })

  const topClinics = data?.clinicRows.slice(0, 6) ?? []
  const topPsychologists = data?.psychologistRows.slice(0, 8) ?? []
  const topQuestionnaires = data?.questionnaireRows.slice(0, 8) ?? []
  const statusRows = data?.responseStatusRows.map((row) => ({ ...row, label: statusLabels[row.status] ?? row.status })) ?? []

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Inteligência"
        title="Relatórios"
        description="Análise detalhada, exportação CSV e tendências operacionais — complemento ao dashboard executivo."
        action={
          <div className="report-actions">
            <Button variant="secondary" size="sm" onClick={() => data && exportClinics(data.clinicRows)} disabled={!data?.clinicRows.length}><Download size={16} aria-hidden="true" /> Clínicas</Button>
            <Button variant="secondary" size="sm" onClick={() => data && exportPsychologists(data.psychologistRows)} disabled={!data?.psychologistRows.length}><Download size={16} aria-hidden="true" /> Psicólogos</Button>
            <Button variant="secondary" size="sm" onClick={() => data && exportQuestionnaires(data.questionnaireRows)} disabled={!data?.questionnaireRows.length}><Download size={16} aria-hidden="true" /> Questionários</Button>
          </div>
        }
      />

      <DataState loading={isLoading} error={error}>
        <section className="stats-grid four">
          <StatCard label="Pacientes ativos" value={`${data?.totals.activePatients ?? 0}/${data?.totals.patients ?? 0}`} icon={Users} />
          <StatCard label="Respostas concluídas" value={`${data?.totals.completedResponses ?? 0}`} detail={`${data?.totals.responses ?? 0} respostas no total`} icon={ClipboardList} tone="blue" />
          <StatCard label="Taxa de conclusão" value={formatPercent(data?.totals.responseCompletionRate ?? 0)} icon={Activity} tone="violet" />
          <StatCard label="Clínicas ativas" value={`${data?.totals.activeClinics ?? 0}/${data?.totals.clinics ?? 0}`} icon={Building2} tone="navy" />
        </section>

        <section className="report-grid">
          <ChartPanel
            title="Evolução mensal"
            description="Volume de respostas criadas e concluídas nos últimos 12 meses."
            icon={LineChartIcon}
          >
            <div className="chart-box">
              {(data?.monthlyResponses ?? []).length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.monthlyResponses ?? []} margin={chartTheme.margins}>
                    <CartesianGrid {...chartTheme.grid} />
                    <XAxis dataKey="label" {...chartTheme.axis} />
                    <YAxis {...chartTheme.axis} allowDecimals={false} />
                    <Tooltip {...chartTheme.tooltip} />
                    <Line type="monotone" dataKey="responses" name="Respostas" stroke={chartColor(1)} strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="completed" name="Concluídas" stroke={chartColor(0)} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyChartState message="Ainda não há respostas suficientes para a série mensal." />}
            </div>
          </ChartPanel>

          <ChartPanel
            title="Status das respostas"
            description="Distribuição do ciclo dos questionários."
            icon={BarChart3}
          >
            <div className="chart-box compact">
              {statusRows.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusRows} dataKey="count" nameKey="label" innerRadius={58} outerRadius={92} paddingAngle={4}>
                      {statusRows.map((_, index) => <Cell key={index} fill={chartColor(index)} />)}
                    </Pie>
                    <Tooltip {...chartTheme.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChartState message="Nenhuma resposta registrada ainda." />}
            </div>
            <div className="legend-list">
              {statusRows.map((row, index) => (
                <span key={row.status}><i style={{ background: chartColor(index) }} /> {row.label}: <strong>{row.count}</strong></span>
              ))}
            </div>
          </ChartPanel>
        </section>

        <ChartPanel
          title="Top clínicas por pacientes ativos"
          description="Demanda operacional por unidade — compare pacientes ativos e volume de respostas."
          icon={FileSpreadsheet}
        >
          <div className="chart-box">
            {topClinics.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topClinics} margin={chartTheme.margins}>
                  <CartesianGrid {...chartTheme.grid} />
                  <XAxis dataKey="name" {...chartTheme.axis} interval={0} angle={-8} textAnchor="end" height={70} />
                  <YAxis {...chartTheme.axis} allowDecimals={false} />
                  <Tooltip {...chartTheme.tooltip} />
                  <Bar dataKey="activePatients" name="Pacientes ativos" fill={chartColor(0)} radius={chartTheme.barRadius} />
                  <Bar dataKey="responses" name="Respostas" fill={chartColor(1)} radius={chartTheme.barRadius} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChartState message="Nenhuma clínica com pacientes ativos para comparar." />}
          </div>
        </ChartPanel>

        <section className="report-tables-grid">
          <article className="panel report-table-panel">
            <div className="panel-header">
              <div>
                <h2>Psicólogos</h2>
                <p>Capacidade, pacientes e produção por profissional.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => data && exportPsychologists(data.psychologistRows)} disabled={!data?.psychologistRows.length}>CSV</Button>
            </div>
            <div className="table-card compact-table report-table">
              <table>
                <thead><tr><th>Profissional</th><th>Clínica</th><th>Pacientes</th><th>Limite</th><th>Respostas</th><th>Status</th></tr></thead>
                <tbody>
                  {topPsychologists.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.name}</strong><small>{row.email}</small></td>
                      <td>{row.clinicName}</td>
                      <td>{row.activePatients}/{row.patients}</td>
                      <td>{row.can_receive_patients ? row.patient_assignment_limit ?? 'Sem limite' : 'Bloqueado'}</td>
                      <td>{row.completedResponses}/{row.responses}</td>
                      <td><Badge tone={row.is_active ? 'success' : 'neutral'}>{row.is_active ? 'Ativo' : 'Inativo'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel report-table-panel">
            <div className="panel-header">
              <div>
                <h2>Questionários</h2>
                <p>Uso dos instrumentos e taxa de conclusão.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => data && exportQuestionnaires(data.questionnaireRows)} disabled={!data?.questionnaireRows.length}>CSV</Button>
            </div>
            <div className="table-card compact-table report-table">
              <table>
                <thead><tr><th>Instrumento</th><th>Status</th><th>Respostas</th><th>Concluídas</th><th>Taxa</th></tr></thead>
                <tbody>
                  {topQuestionnaires.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.name}</strong><small>{row.code}</small></td>
                      <td><Badge tone={row.is_active ? 'success' : 'neutral'}>{row.clinical_status}</Badge></td>
                      <td>{row.responses}</td>
                      <td>{row.completedResponses}</td>
                      <td>{row.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </DataState>
    </div>
  )
}

