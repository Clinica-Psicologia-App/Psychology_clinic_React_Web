import { useMemo, useState } from 'react'
import {
  Activity,
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileDown,
  Flag,
  HeartPulse,
  Layers3,
  LockKeyhole,
  Map,
  Route,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import clsx from 'clsx'
import { useMutation } from '@tanstack/react-query'
import type { PatientDetailData } from '../../types'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { TherapeuticTrail } from './TherapeuticTrail'
import { createPatientTimelineEvent, createTherapyGoal, setPatientResourceReleased } from '../../services/supabaseQueries'

type WorkspaceTab = 'map' | 'timeline' | 'session' | 'journey' | 'resources'

const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof Map }> = [
  { id: 'map', label: 'Mapa clínico', icon: BrainCircuit },
  { id: 'timeline', label: 'Linha do tempo', icon: CalendarClock },
  { id: 'session', label: 'Próxima sessão', icon: Sparkles },
  { id: 'journey', label: 'Jornada', icon: Route },
  { id: 'resources', label: 'Protocolos e recursos', icon: BookOpenCheck },
]

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number')
  return valid.length ? Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10 : null
}

function dateLabel(value?: string | null) {
  if (!value) return 'Data não informada'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value))
}

function scoreTone(value: number | null, inverted = false) {
  if (value == null) return 'neutral'
  const healthy = inverted ? value <= 4 : value >= 6
  const attention = inverted ? value >= 7 : value <= 3
  if (healthy) return 'success'
  if (attention) return 'danger'
  return 'warning'
}

export function ClinicalIntelligence({ data, onChanged }: { data: PatientDetailData; onChanged: () => Promise<unknown> }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('map')
  const [goalForm, setGoalForm] = useState<{ title: string; description: string; target_date: string } | null>(null)
  const [eventForm, setEventForm] = useState<{ title: string; description: string; event_date: string; category: string; emotional_impact: string; is_sensitive: boolean } | null>(null)

  const goalMutation = useMutation({
    mutationFn: (form: NonNullable<typeof goalForm>) => createTherapyGoal({ clinic_id: data.patient.clinic_id, patient_id: data.patient.id, ...form }),
    onSuccess: async () => { setGoalForm(null); await onChanged() },
  })
  const eventMutation = useMutation({
    mutationFn: (form: NonNullable<typeof eventForm>) => createPatientTimelineEvent({ clinic_id: data.patient.clinic_id, patient_id: data.patient.id, ...form, emotional_impact: form.emotional_impact ? Number(form.emotional_impact) : null }),
    onSuccess: async () => { setEventForm(null); await onChanged() },
  })
  const resourceMutation = useMutation({
    mutationFn: ({ resourceId, released }: { resourceId: string; released: boolean }) => setPatientResourceReleased({ patient_id: data.patient.id, resource_id: resourceId, released }),
    onSuccess: async () => { await onChanged() },
  })
  const recentCheckIns = data.checkIns.slice(0, 5)
  const mood = average(recentCheckIns.map((row) => row.mood_score))
  const anxiety = average(recentCheckIns.map((row) => row.anxiety_score))
  const energy = average(recentCheckIns.map((row) => row.energy_score))
  const intensity = average(recentCheckIns.map((row) => row.problem_intensity_score))
  const completionRate = data.totals.responses ? Math.round((data.totals.completedResponses / data.totals.responses) * 100) : 0

  const continuityScore = useMemo(() => {
    let score = 20
    if (data.totals.activeGoals) score += 20
    if (data.checkIns.length) score += 15
    if (data.dailyMonitors.length) score += 15
    if (data.timelineEvents.length) score += 10
    score += Math.min(20, Math.round(completionRate / 5))
    return Math.min(100, score)
  }, [completionRate, data])

  const unifiedTimeline = useMemo(() => [
    ...data.timelineEvents.map((event) => ({
      id: `event-${event.id}`,
      date: event.event_date ?? event.created_at,
      title: event.title,
      detail: event.description ?? event.period_label ?? 'Evento clínico registrado',
      type: event.category ?? 'evento',
      sensitive: event.is_sensitive,
      impact: event.emotional_impact,
    })),
    ...data.responses.map((response) => ({
      id: `response-${response.id}`,
      date: response.completed_at ?? response.created_at,
      title: response.questionnaire_name,
      detail: response.status === 'completed' ? 'Questionário concluído' : 'Questionário iniciado',
      type: 'questionário',
      sensitive: false,
      impact: null,
    })),
    ...data.goals.map((goal) => ({
      id: `goal-${goal.id}`,
      date: goal.completed_at ?? goal.created_at,
      title: goal.title,
      detail: goal.status === 'completed' ? 'Objetivo alcançado' : 'Objetivo terapêutico definido',
      type: 'objetivo',
      sensitive: false,
      impact: null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [data])

  const alerts = [
    !data.totals.activeGoals ? 'Nenhum objetivo terapêutico ativo.' : null,
    !data.checkIns.length ? 'Ainda não há check-ins para comparar a percepção do paciente.' : null,
    data.totals.draftResponses ? `${data.totals.draftResponses} questionário(s) em andamento.` : null,
    intensity != null && intensity >= 7 ? `Intensidade média recente elevada (${intensity}/10).` : null,
    anxiety != null && anxiety >= 7 ? `Ansiedade média recente elevada (${anxiety}/10).` : null,
  ].filter(Boolean) as string[]

  const sessionQuestions = [
    mood != null ? `Como o paciente percebe a média recente de humor em ${mood}/10?` : 'Como o paciente descreve o estado emocional desde o último encontro?',
    anxiety != null ? `O que contribuiu para a ansiedade média de ${anxiety}/10?` : 'Houve situações recentes de ansiedade ou evitação?',
    data.totals.activeGoals ? 'Qual objetivo ativo merece prioridade nesta sessão?' : 'Qual objetivo terapêutico pode ser definido em conjunto?',
  ]

  return (
    <section className="clinical-workspace panel">
      <header className="clinical-workspace-header">
        <div>
          <span className="eyebrow">EsquemaCore Clinical Workspace</span>
          <h2>Raciocínio clínico em uma única visão</h2>
          <p>Organize o caso, acompanhe a jornada e prepare decisões clínicas com contexto longitudinal.</p>
        </div>
        <div className="continuity-score" style={{ background: `conic-gradient(var(--color-brand-accent) ${continuityScore * 3.6}deg, var(--bg-muted) 0deg)` }}>
          <div><strong>{continuityScore}</strong><span>continuidade</span></div>
        </div>
      </header>

      <div className="clinical-tabs" role="tablist" aria-label="Visões clínicas">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={clsx(activeTab === tab.id && 'active')} onClick={() => setActiveTab(tab.id)}>
              <Icon size={16} aria-hidden="true" /><span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="clinical-tab-stage" key={activeTab}>
        {activeTab === 'map' ? (
          <div className="clinical-map-layout">
            <div className="case-map" aria-label="Mapa clínico do paciente">
              <div className="case-map-core"><BrainCircuit size={26} /><strong>{data.patient.full_name.split(' ')[0]}</strong><span>caso clínico</span></div>
              <div className="case-map-node node-goals"><Target size={18} /><strong>Objetivos</strong><span>{data.totals.activeGoals} ativos</span></div>
              <div className="case-map-node node-history"><Flag size={18} /><strong>História</strong><span>{data.timelineEvents.length} eventos</span></div>
              <div className="case-map-node node-measures"><Activity size={18} /><strong>Indicadores</strong><span>{data.totals.completedResponses} avaliações</span></div>
              <div className="case-map-node node-monitor"><HeartPulse size={18} /><strong>Monitoramento</strong><span>{data.checkIns.length + data.dailyMonitors.length} registros</span></div>
              <i className="map-connection connection-a" /><i className="map-connection connection-b" /><i className="map-connection connection-c" /><i className="map-connection connection-d" />
            </div>
            <aside className="clinical-signals">
              <div className="panel-header"><div><h3>Percepção e indicadores</h3><p>Médias dos cinco check-ins mais recentes.</p></div><TrendingUp size={18} /></div>
              <div className="signal-grid">
                <div><span>Humor</span><Badge tone={scoreTone(mood)}>{mood ?? '—'}/10</Badge></div>
                <div><span>Energia</span><Badge tone={scoreTone(energy)}>{energy ?? '—'}/10</Badge></div>
                <div><span>Ansiedade</span><Badge tone={scoreTone(anxiety, true)}>{anxiety ?? '—'}/10</Badge></div>
                <div><span>Intensidade</span><Badge tone={scoreTone(intensity, true)}>{intensity ?? '—'}/10</Badge></div>
              </div>
              <p className="clinical-disclaimer">Indicadores apoiam a revisão profissional e não representam diagnóstico automático.</p>
            </aside>
          </div>
        ) : null}

        {activeTab === 'timeline' ? (
          <div className="clinical-view-stack">
            <div className="clinical-view-actions"><div><h3>Linha do tempo longitudinal</h3><p>Eventos de vida, avaliações e objetivos no mesmo contexto.</p></div><Button variant="secondary" size="sm" onClick={() => setEventForm({ title: '', description: '', event_date: '', category: 'processo_terapeutico', emotional_impact: '', is_sensitive: false })}>Adicionar evento</Button></div>
          {unifiedTimeline.length ? <div className="clinical-timeline">{unifiedTimeline.slice(0, 18).map((item) => (
            <article key={item.id}>
              <div className="timeline-marker" />
              <time>{dateLabel(item.date)}</time>
              <div><div className="timeline-title"><strong>{item.title}</strong><Badge tone="neutral">{item.type}</Badge>{item.sensitive ? <LockKeyhole size={14} aria-label="Conteúdo sensível" /> : null}</div><p>{item.detail}</p>{item.impact != null ? <span className="impact-meter">Impacto emocional <i style={{ width: `${item.impact * 10}%` }} /></span> : null}</div>
            </article>
          ))}</div> : <EmptyState icon={CalendarClock} title="Linha do tempo ainda vazia" description="Eventos de vida, objetivos e avaliações aparecerão aqui em ordem cronológica." />}
          </div>
        ) : null}

        {activeTab === 'session' ? (
          <div className="session-brief-grid">
            <article className="session-brief-primary">
              <span className="eyebrow">Briefing clínico</span><h3>Preparação da próxima sessão</h3>
              <div className="brief-summary"><strong>{data.totals.activeGoals} objetivos ativos</strong><span>{data.totals.draftResponses} instrumentos pendentes · {data.checkIns.length} check-ins recentes</span></div>
              <h4>Perguntas para revisão</h4>
              <ol>{sessionQuestions.map((question) => <li key={question}><ChevronRight size={15} />{question}</li>)}</ol>
            </article>
            <article className="session-alerts">
              <div className="panel-header"><div><h3>Pontos de atenção</h3><p>Gerados a partir dos registros disponíveis.</p></div><ClipboardCheck size={18} /></div>
              {alerts.length ? alerts.map((alert) => <div key={alert}><Flag size={15} /><span>{alert}</span></div>) : <div className="all-clear"><CheckCircle2 size={18} /><span>Nenhuma pendência operacional relevante.</span></div>}
              <Button variant="secondary" onClick={() => window.print()}><FileDown size={16} /> Gerar visão para revisão</Button>
            </article>
          </div>
        ) : null}

        {activeTab === 'journey' ? (
          <TherapeuticTrail data={data} onNavigate={(tab) => setActiveTab(tab)} />
        ) : null}

        {activeTab === 'resources' ? (
          <div className="resource-workspace">
            <div className="protocol-rail">
              <span className="eyebrow">Protocolo sugerido</span><h3>Acompanhamento longitudinal essencial</h3><p>Uma sequência operacional baseada no momento atual deste paciente.</p>
              {['Revisar contexto e linha do tempo', 'Definir ou atualizar objetivos', 'Selecionar instrumento de acompanhamento', 'Liberar recurso terapêutico', 'Agendar reavaliação'].map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong>{index < 4 ? <ChevronRight size={14} /> : null}</div>)}
            </div>
            <div className="context-library">
              <div className="panel-header"><div><h3>Biblioteca contextual</h3><p>Materiais da clínica disponíveis para este acompanhamento.</p></div><Layers3 size={18} /></div>
              {data.resources.length ? data.resources.map((resource) => <article key={resource.id}><div><BookOpenCheck size={18} /></div><span><strong>{resource.title}</strong><small>{resource.description ?? resource.type}</small></span><Button variant={resource.is_released ? 'ghost' : 'secondary'} size="sm" disabled={resourceMutation.isPending} onClick={() => resourceMutation.mutate({ resourceId: resource.id, released: !resource.is_released })}>{resource.is_released ? 'Remover acesso' : 'Liberar'}</Button></article>) : <EmptyState icon={BookOpenCheck} title="Biblioteca ainda vazia" description="Cadastre recursos terapêuticos da clínica para formar protocolos personalizados." />}
            </div>
          </div>
        ) : null}
      </div>

      {goalForm ? <div className="modal-backdrop" role="presentation" onClick={() => setGoalForm(null)}><form className="modal-card" onSubmit={(event) => { event.preventDefault(); goalMutation.mutate(goalForm) }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true"><header><h2>Novo objetivo terapêutico</h2><p>Registre uma direção clara e acompanhável para a jornada.</p></header><label>Título<input autoFocus value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} required /></label><label>Descrição<textarea value={goalForm.description} onChange={(event) => setGoalForm({ ...goalForm, description: event.target.value })} /></label><label>Data-alvo<input type="date" value={goalForm.target_date} onChange={(event) => setGoalForm({ ...goalForm, target_date: event.target.value })} /></label>{goalMutation.error ? <div className="form-step-error">{(goalMutation.error as Error).message}</div> : null}<footer><Button variant="ghost" type="button" onClick={() => setGoalForm(null)}>Cancelar</Button><Button variant="primary" type="submit" disabled={goalMutation.isPending}>{goalMutation.isPending ? 'Salvando...' : 'Criar objetivo'}</Button></footer></form></div> : null}

      {eventForm ? <div className="modal-backdrop" role="presentation" onClick={() => setEventForm(null)}><form className="modal-card" onSubmit={(event) => { event.preventDefault(); eventMutation.mutate(eventForm) }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true"><header><h2>Novo evento clínico</h2><p>Adicione um marco de vida ou do processo terapêutico.</p></header><div className="form-grid two"><label className="span-two">Título<input autoFocus value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} required /></label><label>Data do evento<input type="date" value={eventForm.event_date} onChange={(event) => setEventForm({ ...eventForm, event_date: event.target.value })} /></label><label>Categoria<select value={eventForm.category} onChange={(event) => setEventForm({ ...eventForm, category: event.target.value })}><option value="processo_terapeutico">Processo terapêutico</option><option value="historia_de_vida">História de vida</option><option value="relacionamentos">Relacionamentos</option><option value="saude">Saúde</option><option value="trabalho_estudo">Trabalho ou estudo</option></select></label><label className="span-two">Descrição<textarea value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} /></label><label>Impacto emocional (0-10)<input type="number" min="0" max="10" value={eventForm.emotional_impact} onChange={(event) => setEventForm({ ...eventForm, emotional_impact: event.target.value })} /></label><label className="check-row"><input type="checkbox" checked={eventForm.is_sensitive} onChange={(event) => setEventForm({ ...eventForm, is_sensitive: event.target.checked })} /> Conteúdo sensível</label></div>{eventMutation.error ? <div className="form-step-error">{(eventMutation.error as Error).message}</div> : null}<footer><Button variant="ghost" type="button" onClick={() => setEventForm(null)}>Cancelar</Button><Button variant="primary" type="submit" disabled={eventMutation.isPending}>{eventMutation.isPending ? 'Salvando...' : 'Adicionar à timeline'}</Button></footer></form></div> : null}
    </section>
  )
}
