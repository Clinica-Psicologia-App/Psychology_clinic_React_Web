import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronDown, Download, Eye, FileSearch, Filter, ShieldAlert } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { FilterSelect, SearchField } from '../components/design-system/FilterBar'
import { MetadataBox } from '../components/design-system/MetadataBox'
import { Badge, DataState, PageHeader, RiskBadge, StatCard } from '../components/Ui'
import { getAuditData } from '../services/supabaseQueries'
import type { AuditEventRow } from '../types'

type CsvValue = string | number | boolean | null | undefined

const actionLabels: Record<string, string> = {
  insert: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  questionnaire_publish: 'Publicação de questionário',
  questionnaire_archive: 'Arquivamento de questionário',
  questionnaire_duplicate: 'Duplicação de questionário',
}

const entityLabels: Record<string, string> = {
  patients: 'Paciente',
  profiles: 'Usuário',
  clinics: 'Clínica',
  questionnaires: 'Questionário',
  questionnaire_responses: 'Resposta de questionário',
  questionnaire_results: 'Resultado de questionário',
  patient_resource_access: 'Recurso terapêutico',
  daily_monitors: 'Monitor diário',
  patient_check_ins: 'Check-in',
  therapy_goals: 'Objetivo terapêutico',
  patient_timeline_events: 'Linha do tempo',
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatAction(action: string) {
  return actionLabels[action] ?? action
}

function formatEntity(entity: string) {
  return entityLabels[entity] ?? entity
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

function exportAudit(rows: AuditEventRow[]) {
  downloadCsv('auditoria-eventos.csv', rows.map((event) => ({
    data: formatDateTime(event.occurred_at),
    acao: formatAction(event.action),
    entidade: formatEntity(event.entity_type),
    entidade_id: event.entity_id,
    ator: event.actor_name,
    ator_email: event.actor_email,
    clinica: event.clinic_name,
    metadados: JSON.stringify(event.metadata ?? {}),
  })))
}

function isSensitive(event: AuditEventRow) {
  return event.action === 'delete' || event.action.includes('archive') || event.entity_type.includes('patient')
}

function eventMatchesSearch(event: AuditEventRow, search: string) {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return true
  return [
    event.action,
    formatAction(event.action),
    event.entity_type,
    formatEntity(event.entity_type),
    event.entity_id,
    event.actor_name,
    event.actor_email,
    event.clinic_name,
  ].some((value) => String(value ?? '').toLowerCase().includes(normalized))
}

export function AuditPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['audit'], queryFn: getAuditData })
  const [search, setSearch] = useState('')
  const [clinicId, setClinicId] = useState('all')
  const [actorId, setActorId] = useState('all')
  const [action, setAction] = useState('all')
  const [entityType, setEntityType] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [riskOnly, setRiskOnly] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AuditEventRow | null>(null)
  const [visibleCount, setVisibleCount] = useState(50)

  const filteredEvents = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null
    return (data?.events ?? []).filter((event) => {
      const date = new Date(event.occurred_at)
      const sensitive = isSensitive(event)
      return eventMatchesSearch(event, search)
        && (clinicId === 'all' || event.clinic_id === clinicId)
        && (actorId === 'all' || event.actor_profile_id === actorId)
        && (action === 'all' || event.action === action)
        && (entityType === 'all' || event.entity_type === entityType)
        && (!from || date >= from)
        && (!to || date <= to)
        && (!riskOnly || sensitive)
    })
  }, [action, actorId, clinicId, data?.events, entityType, fromDate, riskOnly, search, toDate])

  const visibleEvents = filteredEvents.slice(0, visibleCount)
  const sensitiveCount = filteredEvents.filter(isSensitive).length
  const deleteCount = filteredEvents.filter((event) => event.action === 'delete').length
  const uniqueActors = new Set(filteredEvents.map((event) => event.actor_profile_id).filter(Boolean)).size

  const advancedFilterCount = [actorId !== 'all', entityType !== 'all', fromDate, toDate].filter(Boolean).length

  function clearFilters() {
    setSearch('')
    setClinicId('all')
    setActorId('all')
    setAction('all')
    setEntityType('all')
    setFromDate('')
    setToDate('')
    setRiskOnly(false)
    setVisibleCount(50)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Governança"
        title="Auditoria"
        description="Rastreio de ações administrativas e eventos sensíveis."
        action={
          <div className="report-actions">
            <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>Atualizar</Button>
            <Button variant="secondary" onClick={() => exportAudit(filteredEvents)} disabled={!filteredEvents.length}>
              <Download size={16} aria-hidden="true" /> Exportar CSV
            </Button>
          </div>
        }
      />

      <DataState loading={isLoading} error={error} onRetry={() => refetch()}>
        <section className="stats-grid four">
          <StatCard label="Eventos filtrados" value={filteredEvents.length} icon={FileSearch} />
          <StatCard label="Ações sensíveis" value={sensitiveCount} icon={ShieldAlert} tone="violet" />
          <StatCard label="Exclusões" value={deleteCount} icon={Filter} tone="blue" />
          <StatCard label="Atores envolvidos" value={uniqueActors} icon={CalendarDays} tone="navy" />
        </section>

        <section className="panel audit-filter-panel">
          <div className="audit-filter-primary">
            <SearchField value={search} onChange={setSearch} placeholder="Buscar ação, entidade, ID ou responsável" />
            <FilterSelect value={clinicId} onChange={setClinicId} label="Clínica">
              <option value="all">Todas as clínicas</option>
              {(data?.clinics ?? []).map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
            </FilterSelect>
            <FilterSelect value={action} onChange={setAction} label="Ação">
              <option value="all">Todas as ações</option>
              {(data?.actions ?? []).map((item) => <option key={item} value={item}>{formatAction(item)}</option>)}
            </FilterSelect>
            <label className="check-row audit-risk-toggle">
              <input type="checkbox" checked={riskOnly} onChange={(event) => setRiskOnly(event.target.checked)} />
              Apenas sensíveis
            </label>
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar</Button>
          </div>

          <Button variant="ghost" size="sm" className="audit-filter-toggle" onClick={() => setAdvancedOpen((open) => !open)}>
            <ChevronDown size={16} aria-hidden="true" style={{ transform: advancedOpen ? 'rotate(180deg)' : undefined }} />
            Filtros avançados{advancedFilterCount ? ` (${advancedFilterCount})` : ''}
          </Button>

          <div className={`audit-filter-advanced ${advancedOpen ? '' : 'is-collapsed'}`}>
            <FilterSelect value={actorId} onChange={setActorId} label="Ator">
              <option value="all">Todos os atores</option>
              {(data?.actors ?? []).map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
            </FilterSelect>
            <FilterSelect value={entityType} onChange={setEntityType} label="Entidade">
              <option value="all">Todas as entidades</option>
              {(data?.entityTypes ?? []).map((item) => <option key={item} value={item}>{formatEntity(item)}</option>)}
            </FilterSelect>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Data inicial" />
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Data final" />
          </div>

          <p className="audit-filter-meta">
            Mostrando <strong>{visibleEvents.length}</strong> de <strong>{filteredEvents.length}</strong> eventos filtrados · base: até 500 eventos recentes
          </p>
        </section>

        <article className="table-card audit-table-card">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>Responsável</th>
                <th>Clínica</th>
                <th>Risco</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.occurred_at)}</td>
                  <td><Badge tone={event.action === 'delete' ? 'danger' : 'neutral'}>{formatAction(event.action)}</Badge></td>
                  <td><strong>{formatEntity(event.entity_type)}</strong><small>{event.entity_id ?? 'Sem ID'}</small></td>
                  <td><strong>{event.actor_name}</strong><small>{event.actor_email ?? 'Sem e-mail'}</small></td>
                  <td>{event.clinic_name ?? 'Plataforma'}</td>
                  <td><RiskBadge sensitive={isSensitive(event)} /></td>
                  <td><Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)}><Eye size={14} aria-hidden="true" /> Ver</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleEvents.length ? <div className="empty audit-empty">Nenhum evento encontrado com os filtros atuais.</div> : null}
        </article>

        {filteredEvents.length > visibleCount ? (
          <Button variant="ghost" fullWidth onClick={() => setVisibleCount((current) => current + 50)}>Carregar mais eventos</Button>
        ) : null}
      </DataState>

      {selectedEvent ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedEvent(null)}>
          <section className="modal-card wide audit-detail-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <span className="eyebrow">Evento de auditoria</span>
              <h2>{formatAction(selectedEvent.action)} em {formatEntity(selectedEvent.entity_type)}</h2>
              <p>{formatDateTime(selectedEvent.occurred_at)}</p>
            </header>
            <div className="audit-detail-grid">
              <div><span>ID do evento</span><strong>{selectedEvent.id}</strong></div>
              <div><span>ID da entidade</span><strong>{selectedEvent.entity_id ?? 'Não informado'}</strong></div>
              <div><span>Responsável</span><strong>{selectedEvent.actor_name}</strong></div>
              <div><span>E-mail</span><strong>{selectedEvent.actor_email ?? 'Não informado'}</strong></div>
              <div><span>Clínica</span><strong>{selectedEvent.clinic_name ?? 'Plataforma'}</strong></div>
              <div><span>Perfil responsável</span><strong>{selectedEvent.actor_profile_id ?? 'Sistema'}</strong></div>
            </div>
            <MetadataBox value={selectedEvent.metadata} />
            <footer>
              <Button variant="ghost" onClick={() => setSelectedEvent(null)}>Fechar</Button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  )
}
