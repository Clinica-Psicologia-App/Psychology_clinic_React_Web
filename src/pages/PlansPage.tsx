import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Building2, CheckCircle2, Edit3, Layers3, ShieldCheck, SlidersHorizontal, Wand2 } from 'lucide-react'
import { Badge } from '../components/design-system/Badge'
import { Button } from '../components/design-system/Button'
import { FilterBar, FilterSelect, SearchField } from '../components/design-system/FilterBar'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { DataState, PageHeader, StatCard, StatusBadge } from '../components/Ui'
import { useAuth } from '../context/auth'
import { getPlansData, saveClinicFeatureEntitlement, saveClinicPlanAssignment } from '../services/supabaseQueries'
import type { ClinicFeatureEntitlement, ClinicPlanRow } from '../types'

type PlanFormState = {
  clinic_id: string
  plan_id: string
  commercial_status: string
  starts_at: string
  ends_at: string
  notes: string
}

type FeatureFormState = {
  clinic_id: string
  feature_key: string
  feature_name: string
  is_enabled: boolean
  limit_value: string
  notes: string
}

type PlanLimitKey = 'psychologists' | 'active_patients' | 'questionnaires'

const statusLabels: Record<string, string> = {
  trial: 'Teste',
  active: 'Ativo',
  past_due: 'Pagamento pendente',
  suspended: 'Suspenso',
  cancelled: 'Cancelado',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function planLimit(row: ClinicPlanRow, key: PlanLimitKey): number | null {
  return readNumber(row.plan?.default_limits?.[key])
}

function featureLimit(row: ClinicPlanRow, featureKey: string): number | null {
  return row.features.find((feature) => feature.feature_key === featureKey)?.limit_value ?? null
}

function usagePercent(used: number, limit: number | null) {
  if (!limit || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function limitStatus(used: number, limit: number | null) {
  if (!limit || limit <= 0) return 'Sem limite'
  if (used > limit) return 'Acima do limite'
  if (used >= limit * 0.9) return 'Atenção'
  return `${used}/${limit}`
}

function defaultFeatureEnabled(row: ClinicPlanRow, featureKey: string) {
  const value = row.plan?.default_features?.[featureKey]
  return typeof value === 'boolean' ? value : false
}

function toPlanForm(row: ClinicPlanRow): PlanFormState {
  return {
    clinic_id: row.clinic.id,
    plan_id: row.assignment?.plan_id ?? '',
    commercial_status: row.assignment?.commercial_status ?? 'trial',
    starts_at: row.assignment?.starts_at?.slice(0, 10) ?? today(),
    ends_at: row.assignment?.ends_at?.slice(0, 10) ?? '',
    notes: row.assignment?.notes ?? '',
  }
}

function toFeatureForm(row: ClinicPlanRow, feature?: ClinicFeatureEntitlement, fallback?: { key: string; name: string }): FeatureFormState {
  return {
    clinic_id: row.clinic.id,
    feature_key: feature?.feature_key ?? fallback?.key ?? 'patients',
    feature_name: feature?.feature_name ?? fallback?.name ?? 'Pacientes',
    is_enabled: feature?.is_enabled ?? true,
    limit_value: feature?.limit_value == null ? '' : String(feature.limit_value),
    notes: feature?.notes ?? '',
  }
}

function limitStatusTone(used: number, limit: number | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!limit || limit <= 0) return 'neutral'
  if (used > limit) return 'danger'
  if (used >= limit * 0.9) return 'warning'
  return 'success'
}

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percent = usagePercent(used, limit)
  const tone = limitStatusTone(used, limit)
  const critical = tone === 'danger'
  const warning = tone === 'warning'

  return (
    <div className={`usage-meter ${critical ? 'critical' : warning ? 'warning' : ''}`}>
      <div className="usage-meter-header">
        <span>{label}</span>
        <Badge tone={tone}>{limitStatus(used, limit)}</Badge>
      </div>
      <div className="usage-track">
        <i style={{ width: `${limit ? percent : 100}%` }} />
      </div>
      <small>{limit ? `${percent}% do limite contratado` : `${used} em uso · sem teto definido`}</small>
    </div>
  )
}

export function PlansPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planForm, setPlanForm] = useState<PlanFormState | null>(null)
  const [featureForm, setFeatureForm] = useState<FeatureFormState | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const { data, isLoading, error } = useQuery({ queryKey: ['plans'], queryFn: getPlansData })

  const filteredRows = useMemo(() => (data?.rows ?? []).filter((row) => {
    const haystack = `${row.clinic.name} ${row.plan?.name ?? ''} ${row.assignment?.commercial_status ?? ''}`.toLowerCase()
    if (search && !haystack.includes(search.toLowerCase())) return false
    if (statusFilter && row.assignment?.commercial_status !== statusFilter) return false
    return true
  }), [data?.rows, search, statusFilter])

  const totals = useMemo(() => {
    const rows = data?.rows ?? []
    const features = rows.flatMap((row) => row.features)
    const rowsWithAlerts = rows.filter((row) => rowAlerts(row).length > 0).length
    return {
      clinics: rows.length,
      active: rows.filter((row) => row.assignment?.commercial_status === 'active').length,
      trial: rows.filter((row) => row.assignment?.commercial_status === 'trial').length,
      suspended: rows.filter((row) => ['suspended', 'cancelled', 'past_due'].includes(row.assignment?.commercial_status ?? '')).length,
      enabledFeatures: features.filter((feature) => feature.is_enabled).length,
      blockedFeatures: features.filter((feature) => !feature.is_enabled).length,
      rowsWithAlerts,
    }
  }, [data?.rows])

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['plans'] }),
      queryClient.invalidateQueries({ queryKey: ['settings'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-executive'] }),
    ])
  }

  const planMutation = useMutation({
    mutationFn: (input: PlanFormState) => saveClinicPlanAssignment({
      clinic_id: input.clinic_id,
      plan_id: input.plan_id || null,
      commercial_status: input.commercial_status,
      starts_at: input.starts_at || today(),
      ends_at: input.ends_at,
      notes: input.notes,
      updated_by: profile!.id,
    }),
    onSuccess: async () => {
      setPlanForm(null)
      setMessage({ tone: 'success', text: 'Plano da clínica atualizado.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const featureMutation = useMutation({
    mutationFn: (input: FeatureFormState) => saveClinicFeatureEntitlement({
      clinic_id: input.clinic_id,
      feature_key: input.feature_key,
      feature_name: input.feature_name,
      is_enabled: input.is_enabled,
      limit_value: input.limit_value.trim() === '' ? null : Number(input.limit_value),
      notes: input.notes,
      updated_by: profile!.id,
    }),
    onSuccess: async () => {
      setFeatureForm(null)
      setMessage({ tone: 'success', text: 'Permissão do módulo atualizada.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const applyDefaultsMutation = useMutation({
    mutationFn: async (row: ClinicPlanRow) => {
      if (!row.plan) throw new Error('Selecione um plano antes de aplicar padrões.')

      await Promise.all((data?.featureCatalog ?? []).map((feature) => {
        const limitKey = feature.key === 'patients'
          ? 'active_patients'
          : feature.key === 'questionnaires'
            ? 'questionnaires'
            : null

        return saveClinicFeatureEntitlement({
          clinic_id: row.clinic.id,
          feature_key: feature.key,
          feature_name: feature.name,
          is_enabled: defaultFeatureEnabled(row, feature.key),
          limit_value: limitKey ? planLimit(row, limitKey) : null,
          notes: `Padrão aplicado a partir do plano ${row.plan?.name ?? ''}`.trim(),
          updated_by: profile!.id,
        })
      }))
    },
    onSuccess: async () => {
      setMessage({ tone: 'success', text: 'Padrões do plano aplicados aos módulos da clínica.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  function openNewFeature(row: ClinicPlanRow) {
    const used = new Set(row.features.map((feature) => feature.feature_key))
    const fallback = data?.featureCatalog.find((feature) => !used.has(feature.key)) ?? data?.featureCatalog[0]
    setFeatureForm(toFeatureForm(row, undefined, fallback))
  }

  function rowAlerts(row: ClinicPlanRow) {
    const alerts: string[] = []
    const activePatientsLimit = featureLimit(row, 'patients') ?? planLimit(row, 'active_patients')
    const psychologistsLimit = planLimit(row, 'psychologists')
    const disabledCore = row.features.filter((feature) => ['patients', 'questionnaires'].includes(feature.feature_key) && !feature.is_enabled)

    if (activePatientsLimit && row.activePatients > activePatientsLimit) {
      alerts.push(`Pacientes ativos acima do limite (${row.activePatients}/${activePatientsLimit}).`)
    } else if (activePatientsLimit && row.activePatients >= activePatientsLimit * 0.9) {
      alerts.push(`Pacientes ativos próximos do limite (${row.activePatients}/${activePatientsLimit}).`)
    }

    if (psychologistsLimit && row.psychologists > psychologistsLimit) {
      alerts.push(`Psicólogos acima do limite (${row.psychologists}/${psychologistsLimit}).`)
    } else if (psychologistsLimit && row.psychologists >= psychologistsLimit * 0.9) {
      alerts.push(`Psicólogos próximos do limite (${row.psychologists}/${psychologistsLimit}).`)
    }

    if (disabledCore.length) {
      alerts.push(`Módulo essencial bloqueado: ${disabledCore.map((feature) => feature.feature_name).join(', ')}.`)
    }

    if (['suspended', 'cancelled', 'past_due'].includes(row.assignment?.commercial_status ?? '')) {
      alerts.push('Status comercial exige atenção.')
    }

    return alerts
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Comercial e acesso"
        title="Planos e permissões"
        description="Controle plano contratado, status comercial, módulos habilitados e limites por clínica."
      />
      {message ? <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 5000 : undefined} /> : null}

      <DataState loading={isLoading} error={error}>
        <section className="stats-grid four">
          <StatCard label="Clínicas gerenciadas" value={totals.clinics} icon={Building2} />
          <StatCard label="Contratos ativos" value={totals.active} icon={CheckCircle2} tone="blue" />
          <StatCard label="Módulos habilitados" value={totals.enabledFeatures} icon={Layers3} tone="violet" detail={`${totals.blockedFeatures} bloqueados`} />
          <StatCard label="Alertas de limite" value={totals.rowsWithAlerts + totals.suspended} icon={AlertTriangle} tone="navy" detail={`${totals.suspended} comerciais`} />
        </section>

        <FilterBar resultCount={filteredRows.length} resultLabel="clínicas">
          <SearchField value={search} onChange={setSearch} placeholder="Buscar clínica, plano ou status" />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} label="Status comercial">
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </FilterSelect>
        </FilterBar>

        <section className="plans-grid">
          {filteredRows.map((row) => (
            <article className={`panel plan-card ${rowAlerts(row).length ? 'has-alerts' : ''}`} key={row.clinic.id}>
              <div className="plan-card-header">
                <div>
                  <h2>{row.clinic.name}</h2>
                  <p>{row.clinic.clinic_type === 'personal' ? 'Individual' : 'Clínica'} • {row.psychologists} psicólogos • {row.activePatients} pacientes ativos</p>
                </div>
                <StatusBadge active={row.clinic.is_active} />
              </div>

              <div className="plan-summary-grid">
                <div><span>Plano</span><strong>{row.plan?.name ?? 'Sem plano'}</strong></div>
                <div><span>Status comercial</span><strong>{statusLabels[row.assignment?.commercial_status ?? 'trial'] ?? 'Teste'}</strong></div>
                <div><span>Início</span><strong>{row.assignment?.starts_at?.slice(0, 10) ?? '-'}</strong></div>
                <div><span>Fim</span><strong>{row.assignment?.ends_at?.slice(0, 10) ?? 'Sem fim'}</strong></div>
              </div>

              <div className="plan-usage-grid">
                <UsageMeter
                  label="Pacientes ativos"
                  used={row.activePatients}
                  limit={featureLimit(row, 'patients') ?? planLimit(row, 'active_patients')}
                />
                <UsageMeter
                  label="Psicólogos"
                  used={row.psychologists}
                  limit={planLimit(row, 'psychologists')}
                />
              </div>

              {rowAlerts(row).length ? (
                <div className="plan-alert-list">
                  {rowAlerts(row).map((alert) => (
                    <span key={alert}><AlertTriangle size={15} /> {alert}</span>
                  ))}
                </div>
              ) : null}

              <div className="action-row">
                <Button variant="ghost" size="sm" onClick={() => setPlanForm(toPlanForm(row))}><Edit3 size={16} aria-hidden="true" /> Editar plano</Button>
                <Button variant="ghost" size="sm" onClick={() => openNewFeature(row)}><SlidersHorizontal size={16} aria-hidden="true" /> Novo módulo</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!row.plan || applyDefaultsMutation.isPending}
                  onClick={() => applyDefaultsMutation.mutate(row)}
                >
                  <Wand2 size={16} aria-hidden="true" /> Aplicar padrão
                </Button>
              </div>

              <div className="feature-chip-grid">
                {row.features.map((feature) => (
                  <button key={feature.id ?? feature.feature_key} className={`feature-chip ${feature.is_enabled ? 'enabled' : 'disabled'}`} onClick={() => setFeatureForm(toFeatureForm(row, feature))}>
                    <ShieldCheck size={15} />
                    <span>{feature.feature_name}</span>
                    <strong>{feature.is_enabled ? 'ON' : 'OFF'}{feature.limit_value == null ? '' : ` • ${feature.limit_value}`}</strong>
                  </button>
                ))}
                {!row.features.length ? <p>Nenhum módulo configurado para esta clínica.</p> : null}
              </div>
            </article>
          ))}
        </section>
      </DataState>

      {planForm ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={(event) => event.target === event.currentTarget && setPlanForm(null)}>
          <form className="modal-card" onSubmit={(event) => { event.preventDefault(); planMutation.mutate(planForm) }}>
            <header><h2>Editar plano</h2><p>Define o plano e status comercial da clínica.</p></header>
            <label>Plano<select value={planForm.plan_id} onChange={(event) => setPlanForm({ ...planForm, plan_id: event.target.value })}><option value="">Sem plano</option>{(data?.plans ?? []).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
            <label>Status comercial<select value={planForm.commercial_status} onChange={(event) => setPlanForm({ ...planForm, commercial_status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Início<input type="date" value={planForm.starts_at} onChange={(event) => setPlanForm({ ...planForm, starts_at: event.target.value })} required /></label>
            <label>Fim<input type="date" value={planForm.ends_at} onChange={(event) => setPlanForm({ ...planForm, ends_at: event.target.value })} /></label>
            <label>Observações<textarea value={planForm.notes} onChange={(event) => setPlanForm({ ...planForm, notes: event.target.value })} /></label>
            <footer><Button variant="ghost" type="button" onClick={() => setPlanForm(null)}>Cancelar</Button><Button variant="primary" type="submit" disabled={planMutation.isPending}>{planMutation.isPending ? 'Salvando...' : 'Salvar plano'}</Button></footer>
          </form>
        </div>
      ) : null}

      {featureForm ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={(event) => event.target === event.currentTarget && setFeatureForm(null)}>
          <form className="modal-card" onSubmit={(event) => { event.preventDefault(); featureMutation.mutate(featureForm) }}>
            <header><h2>Permissão do módulo</h2><p>Habilite, bloqueie ou limite um recurso para a clínica.</p></header>
            <label>Módulo<select value={featureForm.feature_key} onChange={(event) => {
              const selected = data?.featureCatalog.find((feature) => feature.key === event.target.value)
              setFeatureForm({ ...featureForm, feature_key: event.target.value, feature_name: selected?.name ?? featureForm.feature_name })
            }}>{(data?.featureCatalog ?? []).map((feature) => <option key={feature.key} value={feature.key}>{feature.name}</option>)}</select></label>
            <label className="check-row"><input type="checkbox" checked={featureForm.is_enabled} onChange={(event) => setFeatureForm({ ...featureForm, is_enabled: event.target.checked })} /> Módulo habilitado</label>
            <label>Limite opcional<input type="number" min="0" value={featureForm.limit_value} onChange={(event) => setFeatureForm({ ...featureForm, limit_value: event.target.value })} placeholder="Vazio = sem limite" /></label>
            <label>Observações<textarea value={featureForm.notes} onChange={(event) => setFeatureForm({ ...featureForm, notes: event.target.value })} /></label>
            <footer><Button variant="ghost" type="button" onClick={() => setFeatureForm(null)}>Cancelar</Button><Button variant="primary" type="submit" disabled={featureMutation.isPending}>{featureMutation.isPending ? 'Salvando...' : 'Salvar permissão'}</Button></footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}
