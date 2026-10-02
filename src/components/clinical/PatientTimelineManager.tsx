import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarClock, Edit3, LockKeyhole, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { formatDate } from '../../lib/format'
import { createPatientTimelineEvent, deletePatientTimelineEvent, getPatientGenogram, listTimelineEventNotes, listTimelineEventPeople, updatePatientTimelineEvent } from '../../services/supabaseQueries'
import type { PatientDetailData, PatientTimelineEventRow } from '../../types'

const EMOTIONAL_NEED_LABELS: Record<string, string> = {
  presence: 'Sentir que alguém estaria comigo',
  safety: 'Sentir-me seguro(a)',
  affection: 'Receber carinho e atenção',
  understanding: 'Ser ouvido(a) e compreendido(a)',
  acceptance: 'Ser aceito(a) como eu era',
  expression: 'Poder falar sobre o que sentia',
  autonomy: 'Ter liberdade para ser eu mesmo(a)',
  encouragement: 'Receber incentivo e confiança',
  limits: 'Ter limites e orientação',
  play: 'Poder brincar, descansar ou me divertir',
  dont_know: 'Não sei',
  other: 'Outro',
}

const COPING_LABELS: Record<string, string> = {
  avoidance: 'Me afastei / evitei sentir',
  surrender_adaptation: 'Aceitei e busquei me adaptar',
  overcompensation_reaction: 'Explodi / reagi',
  emotional_shutdown: 'Desliguei emocionalmente',
  help_protection: 'Procurei ajuda / proteção',
  perfectionism: 'Tentei "ser perfeito(a)"',
  other: 'Outro',
}

const PRESENT_AREA_LABELS: Record<string, string> = {
  self_view: 'Como me vejo',
  relationships: 'Meus relacionamentos',
  family: 'Minha família',
  emotions: 'Minhas emoções',
  work: 'Meu trabalho ou estudos',
  choices: 'Minhas escolhas',
  coping: 'Minha maneira de lidar com dificuldades',
  other: 'Outro',
}

function resolveKeys(keys: string[] | null | undefined, labels: Record<string, string>): string {
  if (!keys?.length) return ''
  return keys.map((k) => labels[k] ?? k).join(' · ')
}

type TimelineForm = {
  id?: string
  title: string
  description: string
  event_date: string
  period_label: string
  category: string
  emotional_impact: string
  is_sensitive: boolean
}

const emptyTimelineEvent: TimelineForm = {
  title: '',
  description: '',
  event_date: '',
  period_label: '',
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
    period_label: event.period_label ?? '',
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

function TdeSection({ event }: { event: PatientTimelineEventRow }) {
  const hasTde = event.emotions_felt ||
    event.emotional_need_keys?.length ||
    event.self_meaning || event.others_meaning || event.world_meaning ||
    event.coping_keys?.length ||
    event.present_area_keys?.length || event.present_reaction

  if (!hasTde) return null

  return (
    <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--surface-subtle, rgba(0,0,0,0.03))', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', opacity: 0.7 }}>Preenchido pelo paciente</span>
      {event.emotions_felt ? (
        <p style={{ margin: 0, fontSize: 'var(--text-supporting)' }}>
          <strong>O que sentia: </strong>{event.emotions_felt}
        </p>
      ) : null}
      {event.emotional_need_keys?.length ? (
        <p style={{ margin: 0, fontSize: 'var(--text-supporting)' }}>
          <strong>Necessidade emocional: </strong>{resolveKeys(event.emotional_need_keys, EMOTIONAL_NEED_LABELS)}{event.emotional_need_other ? ` — ${event.emotional_need_other}` : ''}
        </p>
      ) : null}
      {(event.self_meaning || event.others_meaning || event.world_meaning) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-muted)' }}>Triângulo cognitivo</span>
          {event.self_meaning ? <p style={{ margin: 0, fontSize: 'var(--text-supporting)' }}><strong>Eu: </strong>{event.self_meaning}</p> : null}
          {event.others_meaning ? <p style={{ margin: 0, fontSize: 'var(--text-supporting)' }}><strong>Os outros: </strong>{event.others_meaning}</p> : null}
          {event.world_meaning ? <p style={{ margin: 0, fontSize: 'var(--text-supporting)' }}><strong>O mundo: </strong>{event.world_meaning}</p> : null}
        </div>
      ) : null}
      {event.coping_keys?.length ? (
        <p style={{ margin: 0, fontSize: 'var(--text-supporting)' }}>
          <strong>Como lidou: </strong>{resolveKeys(event.coping_keys, COPING_LABELS)}{event.coping_other ? ` — ${event.coping_other}` : ''}
        </p>
      ) : null}
      {event.present_area_keys?.length ? (
        <p style={{ margin: 0, fontSize: 'var(--text-supporting)' }}>
          <strong>Ainda influencia: </strong>{resolveKeys(event.present_area_keys, PRESENT_AREA_LABELS)}
          {event.present_influence != null ? ` (${event.present_influence}/10)` : ''}
        </p>
      ) : null}
      {event.present_reaction ? (
        <p style={{ margin: 0, fontSize: 'var(--text-supporting)' }}>
          <strong>Reação atual: </strong>{event.present_reaction}
        </p>
      ) : null}
    </div>
  )
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

  const genogram = useQuery({
    queryKey: ['patient-genogram', data.patient.id],
    queryFn: () => getPatientGenogram(data.patient.id),
  })

  const eventIds = useMemo(() => visibleEvents.map((e) => e.id), [visibleEvents])

  const eventPeople = useQuery({
    queryKey: ['timeline-event-people', eventIds],
    queryFn: () => listTimelineEventPeople(eventIds),
    enabled: eventIds.length > 0,
  })

  const notesByEvent = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of eventNotes.data ?? []) {
      if (n.clinical_comment) map.set(n.event_id, n.clinical_comment)
    }
    return map
  }, [eventNotes.data])

  const personNamesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of genogram.data?.persons ?? []) {
      map.set(p.id, p.nickname || p.full_name)
    }
    return map
  }, [genogram.data?.persons])

  const peopleByEvent = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const ep of eventPeople.data ?? []) {
      const name = personNamesById.get(ep.person_id)
      if (name) {
        const list = map.get(ep.event_id) ?? []
        list.push(name)
        map.set(ep.event_id, list)
      }
    }
    return map
  }, [eventPeople.data, personNamesById])

  const saveMutation = useMutation({
    mutationFn: (input: TimelineForm) => {
      const payload = {
        title: input.title,
        description: input.description,
        event_date: input.event_date,
        period_label: input.period_label,
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
                  <span>{event.event_date ? formatDate(event.event_date) : (event.period_label ?? 'Sem data')}</span>
                  <span>{categoryLabels[event.category ?? ''] ?? event.category ?? 'Sem categoria'}</span>
                  <span>Impacto {event.emotional_impact ?? '—'}/10</span>
                  {event.is_sensitive ? <span><LockKeyhole size={13} aria-hidden="true" /> Conteúdo sensível</span> : null}
                </div>
                {(peopleByEvent.get(event.id) ?? []).length > 0 ? (
                  <div style={{ padding: 'var(--space-2) 0 0', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                    {peopleByEvent.get(event.id)!.map((name) => (
                      <Badge key={name} tone="neutral">{name}</Badge>
                    ))}
                  </div>
                ) : null}
                {notesByEvent.get(event.id) ? (
                  <p style={{ margin: '0', padding: 'var(--space-2) 0 0', fontSize: 'var(--text-supporting)', color: 'var(--color-brand-navy)', display: 'flex', gap: 'var(--space-1)', alignItems: 'flex-start' }}>
                    <MessageSquare size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    {notesByEvent.get(event.id)}
                  </p>
                ) : null}
                <TdeSection event={event} />
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
              <label>Período (se sem data exata)<input placeholder="ex: Infância, Adolescência" value={form.period_label} onChange={(event) => setForm({ ...form, period_label: event.target.value })} /></label>
              <label>Categoria<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                <option value="processo_terapeutico">Processo terapêutico</option>
                <option value="historia_de_vida">História de vida</option>
                <option value="relacionamentos">Relacionamentos</option>
                <option value="saude">Saúde</option>
                <option value="trabalho_estudo">Trabalho ou estudo</option>
              </select></label>
              <label>Impacto emocional<input type="number" min="0" max="10" value={form.emotional_impact} onChange={(event) => setForm({ ...form, emotional_impact: event.target.value })} /></label>
              <label className="span-two">Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
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
