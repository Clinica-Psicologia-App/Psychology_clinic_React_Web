import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase, CalendarDays, ChevronDown, ChevronRight, ClipboardCheck,
  Heart, Lightbulb, Loader2, Plus, Sparkles, Users2,
} from 'lucide-react'
import { DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { formatDate } from '../lib/format'
import { createMyTimelineEvent, getPatientPortalTimeline } from '../services/supabaseQueries'
import type { PatientTimelineEventRow } from '../types'

const CATEGORIES: Array<{ value: string; label: string; icon: React.ElementType; tone: string }> = [
  { value: 'historia_de_vida', label: 'História de vida', icon: Sparkles, tone: 'var(--color-brand-blue)' },
  { value: 'relacionamentos', label: 'Relacionamentos', icon: Heart, tone: 'var(--red)' },
  { value: 'saude', label: 'Saúde', icon: ClipboardCheck, tone: 'var(--green)' },
  { value: 'trabalho_estudo', label: 'Trabalho ou estudo', icon: Briefcase, tone: 'var(--yellow)' },
  { value: 'familia', label: 'Família', icon: Users2, tone: 'var(--chart-3)' },
  { value: 'processo_terapeutico', label: 'Processo terapêutico', icon: Lightbulb, tone: 'var(--color-brand-accent)' },
]

const PERIODS = ['Infância', 'Adolescência', 'Vida adulta jovem', 'Vida adulta', 'Recente']

function categoryInfo(value?: string | null) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0]
}

function groupByPeriod(events: PatientTimelineEventRow[]) {
  const map = new Map<string, PatientTimelineEventRow[]>()
  for (const event of events) {
    const key = event.period_label || (event.event_date ? new Date(event.event_date).getFullYear().toString() : 'Sem data')
    const arr = map.get(key) ?? []
    arr.push(event)
    map.set(key, arr)
  }
  return Array.from(map.entries())
}

function impactBar(value?: number | null) {
  if (value == null) return null
  const pct = (value / 10) * 100
  const color = value >= 7 ? 'var(--red)' : value >= 4 ? 'var(--yellow)' : 'var(--green)'
  return (
    <div className="timeline-impact-bar" title={`Impacto emocional: ${value}/10`}>
      <div className="timeline-impact-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

type WizardStep = 'category' | 'details' | 'period'
type WizardForm = {
  category: string
  title: string
  description: string
  event_date: string
  period_label: string
  emotional_impact: string
}
const emptyWizard: WizardForm = {
  category: 'historia_de_vida',
  title: '',
  description: '',
  event_date: '',
  period_label: '',
  emotional_impact: '',
}

export function PatientTimelinePage() {
  const queryClient = useQueryClient()
  const [wizard, setWizard] = useState<WizardForm | null>(null)
  const [step, setStep] = useState<WizardStep>('category')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const timeline = useQuery({ queryKey: ['patient-portal-timeline'], queryFn: getPatientPortalTimeline })
  const events = timeline.data ?? []
  const grouped = groupByPeriod(events)

  const mutation = useMutation({
    mutationFn: (form: WizardForm) => createMyTimelineEvent({
      title: form.title,
      description: form.description || null,
      event_date: form.event_date || null,
      period_label: form.period_label || null,
      category: form.category,
      emotional_impact: form.emotional_impact ? Number(form.emotional_impact) : null,
    }),
    onSuccess: async () => {
      setWizard(null)
      setStep('category')
      setNotice({ tone: 'success', text: 'Evento adicionado à sua história de vida.' })
      await queryClient.invalidateQueries({ queryKey: ['patient-portal-timeline'] })
    },
    onError: (err) => setNotice({ tone: 'error', text: (err as Error).message }),
  })

  function openWizard() {
    setWizard(emptyWizard)
    setStep('category')
  }

  function closeWizard() {
    setWizard(null)
    setStep('category')
  }

  const sensitiveFree = events.filter((e) => !e.is_sensitive)
  const categoryCount = new Set(events.map((e) => e.category ?? '')).size

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Minha linha do tempo"
        description="Registre momentos, períodos e marcos da sua história de vida."
        action={
          <Button variant="primary" onClick={openWizard}><Plus size={16} aria-hidden="true" /> Adicionar evento</Button>
        }
      />

      {notice ? (
        <InlineNotice tone={notice.tone} message={notice.text} onDismiss={() => setNotice(null)} autoDismissMs={notice.tone === 'success' ? 5000 : undefined} />
      ) : null}

      <section className="stats-grid three">
        <StatCard label="Eventos" value={events.length} icon={CalendarDays} />
        <StatCard label="Categorias" value={categoryCount} icon={Sparkles} tone="blue" />
        <StatCard label="Compartilháveis" value={sensitiveFree.length} icon={Heart} tone="navy" detail="Visíveis ao psicólogo" />
      </section>

      <DataState loading={timeline.isLoading} error={timeline.error} onRetry={() => timeline.refetch()}>
        {events.length ? (
          <div className="timeline-page-layout">
            {grouped.map(([period, periodEvents]) => (
              <section key={period} className="timeline-period-group">
                <h2 className="timeline-period-label">
                  <CalendarDays size={15} aria-hidden="true" />
                  {period}
                </h2>
                <div className="timeline-events-list">
                  {periodEvents.map((event) => {
                    const cat = categoryInfo(event.category)
                    const CatIcon = cat.icon
                    const isOpen = expanded === event.id
                    return (
                      <article key={event.id} className={`timeline-event-card${isOpen ? ' open' : ''}`}>
                        <button
                          type="button"
                          className="timeline-event-header"
                          onClick={() => setExpanded(isOpen ? null : event.id)}
                          aria-expanded={isOpen}
                        >
                          <span className="timeline-event-icon" style={{ color: cat.tone, background: `color-mix(in srgb, ${cat.tone} 12%, transparent)` }}>
                            <CatIcon size={16} aria-hidden="true" />
                          </span>
                          <div className="timeline-event-meta">
                            <strong>{event.title}</strong>
                            <span>
                              {cat.label}
                              {event.event_date ? ` · ${formatDate(event.event_date)}` : ''}
                            </span>
                          </div>
                          {impactBar(event.emotional_impact)}
                          {isOpen ? <ChevronDown size={16} className="timeline-chevron" /> : <ChevronRight size={16} className="timeline-chevron" />}
                        </button>
                        {isOpen && (
                          <div className="timeline-event-body">
                            {event.description ? (
                              <p>{event.description}</p>
                            ) : (
                              <p className="timeline-no-desc">Nenhuma descrição adicionada.</p>
                            )}
                            {event.emotional_impact != null ? (
                              <div className="timeline-impact-detail">
                                <span>Impacto emocional</span>
                                <strong>{event.emotional_impact}/10</strong>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Sua história começa agora"
            description="Adicione eventos, períodos e momentos importantes da sua vida para construir sua linha do tempo."
            action={<Button variant="primary" onClick={openWizard}><Plus size={16} aria-hidden="true" /> Adicionar primeiro evento</Button>}
          />
        )}
      </DataState>

      {/* ── Guided wizard modal ── */}
      {wizard ? (
        <div className="modal-backdrop" role="presentation" onClick={closeWizard}>
          <div className="modal-card wide-modal timeline-wizard" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Adicionar evento de vida</h2>
              <div className="wizard-steps">
                <span className={step === 'category' ? 'active' : step !== 'category' ? 'done' : ''}>1. Tipo</span>
                <span className="wizard-sep">›</span>
                <span className={step === 'details' ? 'active' : step === 'period' ? 'done' : ''}>2. Detalhes</span>
                <span className="wizard-sep">›</span>
                <span className={step === 'period' ? 'active' : ''}>3. Período</span>
              </div>
            </header>

            {step === 'category' && (
              <div className="wizard-step-body">
                <p className="wizard-step-hint">Que tipo de evento você quer registrar?</p>
                <div className="wizard-category-grid">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        className={`wizard-category-card${wizard.category === cat.value ? ' selected' : ''}`}
                        style={{ '--cat-tone': cat.tone } as React.CSSProperties}
                        onClick={() => setWizard({ ...wizard, category: cat.value })}
                      >
                        <Icon size={22} aria-hidden="true" />
                        <span>{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
                <footer>
                  <Button variant="ghost" type="button" onClick={closeWizard}>Cancelar</Button>
                  <Button variant="primary" type="button" onClick={() => setStep('details')}>Próximo</Button>
                </footer>
              </div>
            )}

            {step === 'details' && (
              <form className="wizard-step-body" onSubmit={(e) => { e.preventDefault(); setStep('period') }}>
                <p className="wizard-step-hint">Descreva o que aconteceu e o quanto impactou você.</p>
                <label>
                  Título do evento <span className="required">*</span>
                  <input
                    autoFocus
                    value={wizard.title}
                    onChange={(e) => setWizard({ ...wizard, title: e.target.value })}
                    placeholder="Ex: Início da faculdade, Separação dos pais..."
                    required
                  />
                </label>
                <label>
                  Descrição (opcional)
                  <textarea
                    value={wizard.description}
                    onChange={(e) => setWizard({ ...wizard, description: e.target.value })}
                    placeholder="Como foi? O que sentiu? O que mudou?"
                    rows={4}
                  />
                </label>
                <label>
                  Data aproximada (opcional)
                  <input type="date" value={wizard.event_date} onChange={(e) => setWizard({ ...wizard, event_date: e.target.value })} />
                </label>
                <label>
                  Impacto emocional (0 = neutro · 10 = muito intenso)
                  <div className="impact-slider-row">
                    <input
                      type="range" min="0" max="10"
                      value={wizard.emotional_impact || '5'}
                      onChange={(e) => setWizard({ ...wizard, emotional_impact: e.target.value })}
                    />
                    <strong>{wizard.emotional_impact || '5'}/10</strong>
                  </div>
                </label>
                <footer>
                  <Button variant="ghost" type="button" onClick={() => setStep('category')}>Voltar</Button>
                  <Button variant="primary" type="submit">Próximo</Button>
                </footer>
              </form>
            )}

            {step === 'period' && (
              <form className="wizard-step-body" onSubmit={(e) => { e.preventDefault(); mutation.mutate(wizard) }}>
                <p className="wizard-step-hint">Em que fase da sua vida aconteceu esse evento?</p>
                <div className="wizard-period-grid">
                  {PERIODS.map((period) => (
                    <button
                      key={period}
                      type="button"
                      className={`wizard-period-pill${wizard.period_label === period ? ' selected' : ''}`}
                      onClick={() => setWizard({ ...wizard, period_label: period })}
                    >
                      {period}
                    </button>
                  ))}
                </div>
                <label>
                  Ou descreva o período com suas palavras (opcional)
                  <input
                    value={wizard.period_label}
                    onChange={(e) => setWizard({ ...wizard, period_label: e.target.value })}
                    placeholder="Ex: Aos 14 anos, No trabalho anterior..."
                  />
                </label>
                <footer>
                  <Button variant="ghost" type="button" onClick={() => setStep('details')}>Voltar</Button>
                  <Button variant="primary" type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? <><Loader2 size={16} className="spin" aria-hidden="true" /> Salvando...</> : 'Salvar evento'}
                  </Button>
                </footer>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
