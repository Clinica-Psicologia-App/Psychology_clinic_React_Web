import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Building2, ShieldCheck, UserRoundCheck, Users } from 'lucide-react'
import { Badge, DataState, PageHeader, StatCard } from '../components/Ui'
import { FilterBar, FilterSelect, SearchField } from '../components/design-system/FilterBar'
import { formatDate } from '../lib/format'
import { getPatientOverviewData } from '../services/supabaseQueries'

function percent(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function PatientOverviewPage() {
  const [search, setSearch] = useState('')
  const [clinicFilter, setClinicFilter] = useState('')
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['patient-overview'], queryFn: getPatientOverviewData })

  const clinics = useMemo(() => {
    const unique = new Map((data?.rows ?? []).map((row) => [row.clinic_id, row.clinic_name]))
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [data?.rows])

  const rows = useMemo(() => (data?.rows ?? []).filter((row) => {
    const haystack = `${row.clinic_name} ${row.psychologist_name}`.toLowerCase()
    if (search && !haystack.includes(search.toLowerCase())) return false
    if (clinicFilter && row.clinic_id !== clinicFilter) return false
    return true
  }), [clinicFilter, data?.rows, search])

  const completionRate = data ? percent(data.totals.completedResponses, data.totals.responses) : 0
  const activeRate = data ? percent(data.totals.activePatients, data.totals.patients) : 0
  const appAccessRate = data ? percent(data.totals.withAppAccess, data.totals.patients) : 0

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Privacidade clínica"
        title="Visão agregada de pacientes"
        description="Acompanhamento por clínica e psicólogo sem exposição de dados individuais de pacientes."
      />

      <DataState loading={isLoading} error={error} onRetry={() => refetch()}>
        <section className="stats-grid four">
          <StatCard label="Pacientes ativos" value={`${data?.totals.activePatients ?? 0}/${data?.totals.patients ?? 0}`} icon={UserRoundCheck} detail={`${activeRate}% ativos`} />
          <StatCard label="Clínicas com pacientes" value={data?.totals.clinics ?? 0} icon={Building2} tone="blue" />
          <StatCard label="Psicólogos responsáveis" value={data?.totals.psychologists ?? 0} icon={Users} tone="violet" />
          <StatCard label="Conclusão de respostas" value={`${completionRate}%`} icon={Activity} tone="navy" detail={`${data?.totals.completedResponses ?? 0}/${data?.totals.responses ?? 0}`} />
        </section>

        <article className="panel insight-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Regra de privacidade</span>
              <h2>Administração de plataforma sem prontuário nominal</h2>
              <p>Esta visão segue a regra do app mobile: o escopo de plataforma acompanha operação e capacidade, mas não abre pacientes individuais.</p>
            </div>
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div className="dashboard-health-grid">
            <div><span>Acesso ao app</span><strong>{appAccessRate}%</strong></div>
            <div><span>Inativos</span><strong>{data?.totals.inactivePatients ?? 0}</strong></div>
            <div><span>Linhas agregadas</span><strong>{rows.length}</strong></div>
          </div>
        </article>

        <FilterBar resultCount={rows.length} resultLabel="grupos">
          <SearchField value={search} onChange={setSearch} placeholder="Buscar por clínica ou psicólogo" />
          <FilterSelect value={clinicFilter} onChange={setClinicFilter} label="Filtrar por clínica">
            <option value="">Todas as clínicas</option>
            {clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
          </FilterSelect>
        </FilterBar>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Clínica</th>
                <th>Psicólogo responsável</th>
                <th>Pacientes</th>
                <th>Acesso app</th>
                <th>Respostas</th>
                <th>Último cadastro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.clinic_name}</strong></td>
                  <td>
                    <strong>{row.psychologist_name}</strong>
                    <small>{row.psychologist_id ? 'Responsável vinculado' : 'Sem vínculo responsável'}</small>
                  </td>
                  <td>
                    <Badge tone="success">{row.activePatients} ativos</Badge>
                    <small>{row.inactivePatients} inativos · {row.totalPatients} total</small>
                  </td>
                  <td>{percent(row.withAppAccess, row.totalPatients)}%</td>
                  <td>
                    <strong>{row.completedResponses}/{row.responses}</strong>
                    <small>{percent(row.completedResponses, row.responses)}% concluídas</small>
                  </td>
                  <td>{row.lastPatientCreatedAt ? formatDate(row.lastPatientCreatedAt) : 'Sem cadastro'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <div className="empty">Nenhum grupo agregado encontrado.</div> : null}
        </div>
      </DataState>
    </div>
  )
}
