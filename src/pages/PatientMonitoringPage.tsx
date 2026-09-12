import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, HeartPulse, Plus } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { createMyDailyMonitor, createMyPatientCheckIn, getPatientPortalMonitoring } from '../services/supabaseQueries'

type CheckInForm = {
  mood_score: string
  anxiety_score: string
  energy_score: string
  problem_intensity_score: string
  notes: string
}

type MonitorForm = {
  mood_notes: string
  sleep_notes: string
  activity_notes: string
  emotion_notes: string
}

const emptyCheckIn: CheckInForm = {
  mood_score: '5',
  anxiety_score: '5',
  energy_score: '5',
  problem_intensity_score: '5',
  notes: '',
}

const emptyMonitor: MonitorForm = {
  mood_notes: '',
  sleep_notes: '',
  activity_notes: '',
  emotion_notes: '',
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Data não informada'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function numeric(value: string) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return null
  return Math.max(0, Math.min(10, Math.round(parsed)))
}

function ScoreControl({ label, value, onChange }: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="score-control">
      <span>{label}</span>
      <strong>{value}/10</strong>
      <input type="range" min="0" max="10" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function PatientMonitoringPage() {
  const queryClient = useQueryClient()
  const [checkInForm, setCheckInForm] = useState<CheckInForm | null>(null)
  const [monitorForm, setMonitorForm] = useState<MonitorForm | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const monitoring = useQuery({ queryKey: ['patient-portal-monitoring'], queryFn: getPatientPortalMonitoring })

  const checkInMutation = useMutation({
    mutationFn: (input: CheckInForm) => createMyPatientCheckIn({
      mood_score: numeric(input.mood_score),
      anxiety_score: numeric(input.anxiety_score),
      energy_score: numeric(input.energy_score),
      problem_intensity_score: numeric(input.problem_intensity_score),
      notes: input.notes,
    }),
    onSuccess: async () => {
      setCheckInForm(null)
      setMessage({ tone: 'success', text: 'Check-in registrado com sucesso.' })
      await queryClient.invalidateQueries({ queryKey: ['patient-portal-monitoring'] })
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const monitorMutation = useMutation({
    mutationFn: createMyDailyMonitor,
    onSuccess: async () => {
      setMonitorForm(null)
      setMessage({ tone: 'success', text: 'Monitor diário registrado com sucesso.' })
      await queryClient.invalidateQueries({ queryKey: ['patient-portal-monitoring'] })
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const checkIns = monitoring.data?.checkIns ?? []
  const monitors = monitoring.data?.dailyMonitors ?? []

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Meu acompanhamento"
        description="Registre check-ins rápidos e observações diárias para apoiar suas sessões."
        action={
          <div className="table-actions">
            <Button variant="secondary" onClick={() => setMonitorForm(emptyMonitor)}><Plus size={16} aria-hidden="true" /> Monitor diário</Button>
            <Button variant="primary" onClick={() => setCheckInForm(emptyCheckIn)}><Plus size={16} aria-hidden="true" /> Check-in</Button>
          </div>
        }
      />

      {message ? (
        <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 5000 : undefined} />
      ) : null}

      <DataState loading={monitoring.isLoading} error={monitoring.error} onRetry={() => monitoring.refetch()}>
        <section className="stats-grid three">
          <StatCard label="Check-ins" value={checkIns.length} icon={HeartPulse} />
          <StatCard label="Monitores" value={monitors.length} icon={Activity} tone="blue" />
          <StatCard label="Último registro" value={checkIns[0] ? formatDateTime(checkIns[0].checked_in_at).slice(0, 10) : '-'} icon={HeartPulse} tone="navy" />
        </section>

        <section className="monitoring-grid">
          <article className="panel">
            <div className="panel-header">
              <div><h2>Histórico de check-ins</h2><p>Humor, ansiedade, energia e intensidade do problema.</p></div>
              <HeartPulse size={20} aria-hidden="true" />
            </div>
            {checkIns.length ? (
              <div className="monitoring-list">
                {checkIns.map((item) => (
                  <div className="monitoring-item" key={item.id}>
                    <div>
                      <strong>{formatDateTime(item.checked_in_at)}</strong>
                      <span>{item.notes || 'Sem observações adicionais.'}</span>
                    </div>
                    <div className="context-progress-list">
                      <Badge tone="success">Humor {item.mood_score ?? '-'}</Badge>
                      <Badge tone="warning">Ansiedade {item.anxiety_score ?? '-'}</Badge>
                      <Badge tone="info">Energia {item.energy_score ?? '-'}</Badge>
                      <Badge tone="neutral">Intensidade {item.problem_intensity_score ?? '-'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={HeartPulse} title="Nenhum check-in" description="Registre seu primeiro check-in para acompanhar variações ao longo do tempo." />
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div><h2>Monitor diário</h2><p>Notas livres sobre humor, sono, atividades e emoções.</p></div>
              <Activity size={20} aria-hidden="true" />
            </div>
            {monitors.length ? (
              <div className="monitoring-list">
                {monitors.map((item) => (
                  <div className="monitoring-item" key={item.id}>
                    <div>
                      <strong>{formatDateTime(item.created_at)}</strong>
                      <span>{item.mood_notes || 'Humor não informado.'}</span>
                    </div>
                    <div className="monitoring-notes-grid">
                      <p><strong>Sono</strong>{item.sleep_notes || '-'}</p>
                      <p><strong>Atividade</strong>{item.activity_notes || '-'}</p>
                      <p><strong>Emoções</strong>{item.emotion_notes || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Activity} title="Nenhum monitor diário" description="Registre observações do dia para construir histórico com seu psicólogo." />
            )}
          </article>
        </section>
      </DataState>

      {checkInForm ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setCheckInForm(null)}>
          <form className="modal-card" role="dialog" aria-modal="true" onSubmit={(event) => { event.preventDefault(); checkInMutation.mutate(checkInForm) }} onClick={(event) => event.stopPropagation()}>
            <header><h2>Novo check-in</h2><p>Use 0 para muito baixo e 10 para muito alto.</p></header>
            <ScoreControl label="Humor" value={checkInForm.mood_score} onChange={(value) => setCheckInForm({ ...checkInForm, mood_score: value })} />
            <ScoreControl label="Ansiedade" value={checkInForm.anxiety_score} onChange={(value) => setCheckInForm({ ...checkInForm, anxiety_score: value })} />
            <ScoreControl label="Energia" value={checkInForm.energy_score} onChange={(value) => setCheckInForm({ ...checkInForm, energy_score: value })} />
            <ScoreControl label="Intensidade do problema" value={checkInForm.problem_intensity_score} onChange={(value) => setCheckInForm({ ...checkInForm, problem_intensity_score: value })} />
            <label>Observações<textarea value={checkInForm.notes} onChange={(event) => setCheckInForm({ ...checkInForm, notes: event.target.value })} /></label>
            <footer><Button variant="ghost" type="button" onClick={() => setCheckInForm(null)}>Cancelar</Button><Button variant="primary" type="submit" disabled={checkInMutation.isPending}>{checkInMutation.isPending ? 'Salvando...' : 'Registrar check-in'}</Button></footer>
          </form>
        </div>
      ) : null}

      {monitorForm ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setMonitorForm(null)}>
          <form className="modal-card" role="dialog" aria-modal="true" onSubmit={(event) => { event.preventDefault(); monitorMutation.mutate(monitorForm) }} onClick={(event) => event.stopPropagation()}>
            <header><h2>Novo monitor diário</h2><p>Registre livremente o que foi relevante no dia.</p></header>
            <label>Humor<textarea autoFocus value={monitorForm.mood_notes} onChange={(event) => setMonitorForm({ ...monitorForm, mood_notes: event.target.value })} /></label>
            <label>Sono<textarea value={monitorForm.sleep_notes} onChange={(event) => setMonitorForm({ ...monitorForm, sleep_notes: event.target.value })} /></label>
            <label>Atividade<textarea value={monitorForm.activity_notes} onChange={(event) => setMonitorForm({ ...monitorForm, activity_notes: event.target.value })} /></label>
            <label>Emoções<textarea value={monitorForm.emotion_notes} onChange={(event) => setMonitorForm({ ...monitorForm, emotion_notes: event.target.value })} /></label>
            <footer><Button variant="ghost" type="button" onClick={() => setMonitorForm(null)}>Cancelar</Button><Button variant="primary" type="submit" disabled={monitorMutation.isPending}>{monitorMutation.isPending ? 'Salvando...' : 'Registrar monitor'}</Button></footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}
