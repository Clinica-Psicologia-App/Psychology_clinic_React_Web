import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarClock, Edit3, LockKeyhole, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { formatDate } from '../../lib/format'
import { createPatientTimelineEvent, deletePatientTimelineEvent, listTimelineEventNotes, updatePatientTimelineEvent } from '../../services/supabaseQueries'
import type { PatientDetailData, PatientTimelineEventRow } from '../../types'

type TimelineForm = {
  id?: string
  title: string
  description: string
  event_date: string
  category: string
  emotional_impact: string
  is_sensitive: boolean
}

const emptyTimelineEvent: TimelineForm = {
  title: '',
  description: '',
  event_date: '',
  category: 'processo_terapeutico',
  emotional_impact: '',
  is_sensitive: false,
}

const categoryLabels: Record<string, string> = {
  processo_terapeutico: 'Processo terapêutico',
  historia_de_vida: 'História de vida',
  relacionamentos: 'Relacionamentos',
  saude: 'Saúde',
  trabalho_estudo: 'Trabalho ou estudo',
}

function toForm(event: PatientTimelineEventRow): TimelineForm {
  return {
    id: event.id,
    title: event.title,
    description: event.description ?? '',
    event_date: event.event_date?.slice(0, 10) ?? '',
    category: event.category ?? 'processo_terapeutico',
    emotional_impact: event.emotional_impact == null ? '' : String(event.emotional_impact),
    is_sensitive: event.is_sensitive,
  }
}

function clampImpact(value: string) {
  if (!value) return null
  const number = Number(value)
  if (Number.isNaN(number)) return null
  return Math.max(0, Math.min(10, Math.round(number)))
}

export function PatientTimelineManager({ data, onChanged }: {
  data: PatientDetailData
  onChanged: () => Promise<unknown>
}) {
  const [form, setForm] = useState<TimelineForm | null>(null)
  const visibleEvents = data.timelineEvents.slice(0, 20)

  const eventNotes = useQuery({
    queryKey: ['timeline-event-notes', data.patient.id],
    queryFn: () => listTimelineEventNotes(data.patient.id),
  })

  const notesByEvent = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of eventNotes.data ?? []) {
      if (n.clinical_comment) map.set(n.event_id, n.clinical_comment)
    }
    return map
  }, [eventNotes.data])

  const saveMutation = useMutation({
    mutationFn: (input: TimelineForm) => {
      const payload = {
        title: input.title,
        description: input.description,
        event_date: input.event_date,
        category: input.category,
        emotional_impact: clampImpact(input.emotional_impact),
        is_sensitive: input.is_sensitive,
      }

      return input.id
        ? updatePatientTimelineEvent({ id: input.id, ...payload })
        : createPatientTimelineEvent({ clinic_id: data.patient.clinic_id, patient_id: data.patient.id, ...payload })
    },
    onSuccess: async () => {
      setForm(null)
      await onChanged()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePatientTimelineEvent,
    onSuccess: async () => { await onChanged() },
  })

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form?.title.trim()) return
    saveMutation.mutate(form)
  }

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Prontuário operacional</span>
          <h2>Linha do tempo clínica</h2>
          <p>CRUD dos eventos relevantes do caso, com impacto emocional e sensibilidade.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setForm(emptyTimelineEvent)}>
          <Plus size={16} aria-hidden="true" /> Novo evento
        </Button>
      </div>

      {saveMutation.error || deleteMutation.error ? (
        <div className="form-step-error">{((saveMutation.error ?? deleteMutation.error) as Error).message}</div>
      ) : null}

      {visibleEvents.length ? (
        <div className="goal-card-list">
          {visibleEvents.map((event) => {
            const impact = event.emotional_impact ?? 0
            return (
              <section className="goal-card" key={event.id}>
                <div className="goal-card-head">
                  <div>
                    <strong>{event.title}</strong>
                    <span>{event.description || event.period_label || 'Sem descrição'}</span>
                  </div>
                  <Badge tone={event.is_sensitive ? 'warning' : 'neutral'}>{event.is_sensitive ? 'Sensível' : 'Registro comum'}</Badge>
                </div>
                <div className="goal-progress">
                  <span style={{ width: `${impact * 10}%` }} />
                </div>
                <div className="goal-meta-row">
                  <span>{event.event_date ? formatDate(event.event_date) : 'Sem data'}</span>
                  <span>{categoryLabels[event.category ?? ''] ?? event.category ?? 'Sem categoria'}</span>
                  <span>Impacto {event.emotional_impact ?? '—'}/10</span>
                  {event.is_sensitive ? <span><LockKeyhole size={13} aria-hidden="true" /> Conteúdo sensível</span> : null}
                </div>
                {notesByEvent.get(event.id) ? (
                  <p style={{ margin: '0', padding: 'var(--space-2) 0 0', fontSize: 'var(--text-supporting)', color: 'var(--color-brand-navy)', display: 'flex', gap: 'var(--space-1)', alignItems: 'flex-start' }}>
                    <MessageSquare size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    {notesByEvent.get(event.id)}
                  </p>
                ) : null}
                <div className="table-actions">
                  <Button variant="ghost" size="sm" onClick={() => setForm(toForm(event))}><Edit3 size={15} aria-hidden="true" /> Editar</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm('Remover este evento da linha do tempo?')) deleteMutation.mutate(event.id)
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" /> Remover
                  </Button>
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarClock}
          title="Nenhum evento registrado"
          description="Adicione marcos de vida ou do processo terapêutico para apoiar a formulação do caso."
        />
      )}

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card" onSubmit={submit} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>{form.id ? 'Editar evento clínico' : 'Novo evento clínico'}</h2>
              <p>Estruture o evento para manter o raciocínio clínico navegável.</p>
            </header>
            <div className="form-grid two">
              <label className="span-two">Título<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
              <label>Data do evento<input type="date" value={form.event_date} onChange={(event) => setForm({ ...form, event_date: event.target.value })} /></label>
              <label>Categoria<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                <option value="processo_terapeutico">Processo terapêutico</option>
                <option value="historia_de_vida">História de vida</option>
                <option value="relacionamentos">Relacionamentos</option>
                <option value="saude">Saúde</option>
                <option value="trabalho_estudo">Trabalho ou estudo</option>
              </select></label>
              <label className="span-two">Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <label>Impacto emocional<input type="number" min="0" max="10" value={form.emotional_impact} onChange={(event) => setForm({ ...form, emotional_impact: event.target.value })} /></label>
              <label className="check-row"><input type="checkbox" checked={form.is_sensitive} onChange={(event) => setForm({ ...form, is_sensitive: event.target.checked })} /> Conteúdo sensível</label>
            </div>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar evento'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </article>
  )
}
