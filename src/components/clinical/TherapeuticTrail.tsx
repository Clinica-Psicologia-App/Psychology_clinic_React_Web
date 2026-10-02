/**
 * Jornada do paciente — visão do terapeuta.
 * Espelha o modelo de 12 passos / 5 fases de journey_step.dart (Flutter).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, BookOpenCheck, Brain, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardCheck, HeartPulse, Map, Sparkles, Target, Users,
} from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { getPatientGenogram } from '../../services/supabaseQueries'
import type { PatientDetailData } from '../../types'

type WorkspaceTab = 'map' | 'timeline' | 'session' | 'journey' | 'resources'
type Availability = 'completed' | 'inProgress' | 'available' | 'notStarted'

// ── Fases (espelha JourneyPhase) ─────────────────────────────────────────────

const PHASES = [
  { id: 'conhecer',    label: 'Conhecer',    subtitle: 'Sua história e contexto' },
  { id: 'avaliar',     label: 'Avaliar',     subtitle: 'Instrumentos e avaliação' },
  { id: 'compreender', label: 'Compreender', subtitle: 'Entendendo o quadro' },
  { id: 'intervir',    label: 'Intervir',    subtitle: 'Plano e recursos' },
  { id: 'acompanhar',  label: 'Acompanhar',  subtitle: 'Evolução ao longo do tempo' },
] as const

type PhaseId = typeof PHASES[number]['id']

// ── Tipo de passo ─────────────────────────────────────────────────────────────

type Milestone = { label: string; done: boolean }

type JourneyStep = {
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  phase: PhaseId
  isLateral: boolean   // nó de apoio (não está no fio principal)
  availability: Availability
  milestones: Milestone[]
  navigateTo?: WorkspaceTab
  navigateLabel?: string
  progressHint?: string
}

// ── Builder de passos ─────────────────────────────────────────────────────────

function buildSteps(data: PatientDetailData, genogramPersonCount: number): JourneyStep[] {
  const p = data.patient

  // initialAssessment: fração de campos-chave preenchidos
  const assessFields = [p.full_name, p.birth_date, p.occupation, p.therapy_demands]
  const assessFilled = assessFields.filter(Boolean).length
  const assessFrac = assessFilled / assessFields.length

  // questionnaires: respostas existentes/completas
  const totalAssigned = data.questionnaireAssignments.length
  const totalCompleted = data.totals.completedResponses

  // resources
  const releasedResourceCount = data.resources.filter((r) => r.is_released).length
  const completedResourceCount = data.resources.filter((r) => r.is_released && (r as unknown as Record<string,unknown>).completed_by_patient).length

  function avail(completed: boolean, inProgress: boolean): Availability {
    if (completed) return 'completed'
    if (inProgress) return 'inProgress'
    return 'notStarted'
  }

  return [
    // ── Fase I: Conhecer ──────────────────────────────────────────────────────
    {
      id: 'initialAssessment',
      title: 'Conhecendo você',
      subtitle: 'Dados de contexto clínico e perfil do paciente.',
      icon: ClipboardCheck,
      phase: 'conhecer',
      isLateral: false,
      availability: avail(assessFrac >= 1, assessFrac > 0),
      milestones: [
        { label: 'Nome e dados básicos', done: Boolean(p.full_name) },
        { label: 'Data de nascimento', done: Boolean(p.birth_date) },
        { label: 'Ocupação / contexto de vida', done: Boolean(p.occupation) },
        { label: 'Queixa / demanda principal', done: Boolean(p.therapy_demands) },
      ],
      navigateTo: 'map',
      navigateLabel: 'Ver mapa clínico',
    },
    {
      id: 'psychoeducation',
      title: 'Biblioteca de Psicoeducação',
      subtitle: 'Materiais de psicoeducação disponibilizados ao paciente.',
      icon: BookOpenCheck,
      phase: 'conhecer',
      isLateral: true,
      availability: avail(completedResourceCount > 0, releasedResourceCount > 0),
      milestones: [
        { label: 'Pelo menos 1 recurso liberado', done: releasedResourceCount > 0 },
        { label: 'Paciente acessou algum recurso', done: completedResourceCount > 0 },
      ],
      navigateTo: 'resources',
      navigateLabel: 'Ver biblioteca',
    },
    {
      id: 'timeline',
      title: 'Linha da vida',
      subtitle: 'Eventos de vida significativos mapeados pelo paciente.',
      icon: Activity,
      phase: 'conhecer',
      isLateral: false,
      availability: avail(data.timelineEvents.length >= 5, data.timelineEvents.length > 0),
      progressHint: `${data.timelineEvents.length} / 5 eventos`,
      milestones: [
        { label: 'Primeiro evento registrado', done: data.timelineEvents.length > 0 },
        { label: '3 ou mais eventos mapeados', done: data.timelineEvents.length >= 3 },
        { label: '5 eventos (trilha completa)', done: data.timelineEvents.length >= 5 },
      ],
      navigateTo: 'timeline',
      navigateLabel: 'Ver linha do tempo',
    },
    {
      id: 'genogram',
      title: 'Genograma',
      subtitle: 'Mapa familiar intergeracional do paciente.',
      icon: Users,
      phase: 'conhecer',
      isLateral: false,
      availability: avail(genogramPersonCount >= 5, genogramPersonCount > 0),
      progressHint: `${genogramPersonCount} / 5 pessoas`,
      milestones: [
        { label: 'Primeira pessoa adicionada', done: genogramPersonCount > 0 },
        { label: '3 ou mais pessoas mapeadas', done: genogramPersonCount >= 3 },
        { label: '5 pessoas (genograma completo)', done: genogramPersonCount >= 5 },
      ],
      navigateTo: 'map',
      navigateLabel: 'Ver mapa clínico',
    },

    // ── Fase II: Avaliar ───────────────────────────────────────────────────────
    {
      id: 'questionnaires',
      title: 'Questionários',
      subtitle: 'Instrumentos de avaliação psicológica aplicados.',
      icon: ClipboardCheck,
      phase: 'avaliar',
      isLateral: false,
      availability: avail(totalAssigned > 0 && totalCompleted >= totalAssigned, totalCompleted > 0),
      progressHint: totalAssigned > 0 ? `${totalCompleted} / ${totalAssigned} concluídos` : undefined,
      milestones: [
        { label: 'Pelo menos 1 questionário atribuído', done: totalAssigned > 0 },
        { label: 'Primeiro questionário concluído', done: totalCompleted > 0 },
        { label: 'Instrumento de personalidade aplicado', done: data.responses.some((r) => r.questionnaire_name?.toLowerCase().includes('esquema') || r.questionnaire_name?.toLowerCase().includes('yami') || r.questionnaire_name?.toLowerCase().includes('ysq')) },
      ],
      navigateTo: 'session',
      navigateLabel: 'Preparar sessão',
    },

    // ── Fase III: Compreender ──────────────────────────────────────────────────
    {
      id: 'problems',
      title: 'Problemas e demandas',
      subtitle: 'Mapeamento dos problemas clínicos prioritários.',
      icon: Map,
      phase: 'compreender',
      isLateral: false,
      availability: avail(data.problems.some((pr) => pr.status === 'resolved'), data.problems.length > 0),
      milestones: [
        { label: 'Pelo menos 1 problema registrado', done: data.problems.length > 0 },
        { label: '2 ou mais problemas mapeados', done: data.problems.length >= 2 },
        { label: 'Pelo menos 1 problema resolvido', done: data.problems.some((pr) => pr.status === 'resolved') },
      ],
      navigateTo: 'journey',
      navigateLabel: 'Ver plano clínico',
    },
    {
      id: 'mentalMap',
      title: 'Mapa mental',
      subtitle: 'Formulação visual integrada do caso clínico.',
      icon: Brain,
      phase: 'compreender',
      isLateral: false,
      availability: avail(data.responseResults.length >= 2, data.responseResults.length > 0),
      milestones: [
        { label: 'Resultados de questionários disponíveis', done: data.responseResults.length > 0 },
        { label: 'Resultados liberados para o paciente', done: data.responseResults.length >= 2 },
        { label: 'Dados suficientes para formulação', done: data.totals.completedResponses >= 2 && data.timelineEvents.length > 0 },
      ],
      navigateTo: 'map',
      navigateLabel: 'Ver mapa mental',
    },

    // ── Fase IV: Intervir ──────────────────────────────────────────────────────
    {
      id: 'therapyGoals',
      title: 'Objetivos da terapia',
      subtitle: 'Metas terapêuticas definidas e acompanháveis.',
      icon: Target,
      phase: 'intervir',
      isLateral: false,
      availability: avail(data.goals.some((g) => g.status === 'completed'), data.goals.length > 0),
      milestones: [
        { label: 'Pelo menos 1 objetivo ativo', done: data.totals.activeGoals > 0 },
        { label: '2 ou mais objetivos definidos', done: data.goals.length >= 2 },
        { label: 'Pelo menos 1 objetivo concluído', done: data.goals.some((g) => g.status === 'completed') },
      ],
      navigateTo: 'journey',
      navigateLabel: 'Ver objetivos',
    },
    {
      id: 'library',
      title: 'Biblioteca terapêutica',
      subtitle: 'Recursos e protocolos liberados para o paciente.',
      icon: BookOpenCheck,
      phase: 'intervir',
      isLateral: true,
      availability: avail(completedResourceCount > 0, releasedResourceCount > 0),
      milestones: [
        { label: 'Recurso liberado ao paciente', done: releasedResourceCount > 0 },
        { label: 'Paciente acessou pelo menos 1 recurso', done: completedResourceCount > 0 },
      ],
      navigateTo: 'resources',
      navigateLabel: 'Ver biblioteca',
    },

    // ── Fase V: Acompanhar ────────────────────────────────────────────────────
    {
      id: 'dailyMonitor',
      title: 'Monitor diário',
      subtitle: 'Registro diário de humor, sono e bem-estar entre sessões.',
      icon: Activity,
      phase: 'acompanhar',
      isLateral: false,
      availability: avail(false, data.dailyMonitors.length > 0),
      progressHint: data.dailyMonitors.length > 0 ? `${data.dailyMonitors.length} registros` : undefined,
      milestones: [
        { label: 'Primeiro monitor registrado', done: data.dailyMonitors.length > 0 },
        { label: '5 ou mais monitores', done: data.dailyMonitors.length >= 5 },
        { label: 'Uso consistente (10+)', done: data.dailyMonitors.length >= 10 },
      ],
      navigateTo: 'map',
      navigateLabel: 'Ver indicadores',
    },
    {
      id: 'checkIn',
      title: 'Check-in',
      subtitle: 'Avaliação rápida de humor e modos por sessão.',
      icon: HeartPulse,
      phase: 'acompanhar',
      isLateral: true,
      availability: avail(false, data.checkIns.length > 0),
      progressHint: data.checkIns.length > 0 ? `${data.checkIns.length} check-ins` : undefined,
      milestones: [
        { label: 'Primeiro check-in registrado', done: data.checkIns.length > 0 },
        { label: '5 ou mais check-ins', done: data.checkIns.length >= 5 },
        { label: 'Padrão de modos identificável', done: data.checkIns.length >= 3 },
      ],
      navigateTo: 'map',
      navigateLabel: 'Ver indicadores',
    },
    {
      id: 'results',
      title: 'Meus resultados',
      subtitle: 'Resultados liberados e evolução dos scores ao longo do tempo.',
      icon: Sparkles,
      phase: 'acompanhar',
      isLateral: false,
      availability: avail(data.totals.completedResponses >= 2, data.totals.completedResponses > 0),
      milestones: [
        { label: 'Primeiro resultado disponível', done: data.totals.completedResponses > 0 },
        { label: 'Reaplicação (2ª avaliação)', done: data.totals.completedResponses >= 2 },
        { label: '3 ou mais avaliações para tendência', done: data.totals.completedResponses >= 3 },
      ],
      navigateTo: 'session',
      navigateLabel: 'Ver evolução',
    },
  ]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function availTone(a: Availability): 'success' | 'info' | 'neutral' {
  if (a === 'completed') return 'success'
  if (a === 'inProgress') return 'info'
  return 'neutral'
}

function availLabel(a: Availability): string {
  if (a === 'completed') return 'Concluído'
  if (a === 'inProgress') return 'Em andamento'
  return 'Não iniciado'
}

function phaseProgress(steps: JourneyStep[], phaseId: PhaseId) {
  const phaseSteps = steps.filter((s) => s.phase === phaseId && !s.isLateral)
  const done = phaseSteps.filter((s) => s.availability === 'completed').length
  const inProg = phaseSteps.filter((s) => s.availability === 'inProgress').length
  return { total: phaseSteps.length, done, active: inProg > 0 || (done > 0 && done < phaseSteps.length) }
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function PhaseStrip({ steps }: { steps: JourneyStep[] }) {
  return (
    <div className="journey-phase-strip">
      {PHASES.map((phase) => {
        const { total, done, active } = phaseProgress(steps, phase.id)
        const state = done === total ? 'done' : active ? 'active' : 'pending'
        return (
          <div key={phase.id} className={`journey-phase-pill journey-phase-pill--${state}`}>
            <span className="journey-phase-label">{phase.label}</span>
            <span className="journey-phase-sub">{done}/{total}</span>
          </div>
        )
      })}
    </div>
  )
}

function StepCard({
  step,
  isOpen,
  onToggle,
  onNavigate,
}: {
  step: JourneyStep
  isOpen: boolean
  onToggle: () => void
  onNavigate: (tab: WorkspaceTab) => void
}) {
  const Icon = step.icon
  const milestoneDone = step.milestones.filter((m) => m.done).length

  return (
    <div className={`journey-step${step.isLateral ? ' journey-step--lateral' : ''} journey-step--${step.availability}`}>
      <button type="button" className="journey-step-header" onClick={onToggle} aria-expanded={isOpen}>
        <span className="journey-step-icon">
          {step.availability === 'completed'
            ? <CheckCircle2 size={16} aria-hidden="true" />
            : step.availability === 'inProgress'
            ? <Icon size={16} aria-hidden="true" />
            : <Icon size={16} aria-hidden="true" />}
        </span>
        <div className="journey-step-meta">
          <strong>{step.title}</strong>
          {step.isLateral && <span className="journey-step-lateral-tag">Apoio</span>}
          <span>{step.subtitle}</span>
        </div>
        <div className="journey-step-right">
          <Badge tone={availTone(step.availability)}>{availLabel(step.availability)}</Badge>
          {step.progressHint ? <span className="journey-step-hint">{step.progressHint}</span> : null}
          <span className="journey-step-milestone-count">{milestoneDone}/{step.milestones.length}</span>
          {isOpen ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
        </div>
      </button>

      {isOpen ? (
        <div className="journey-step-body">
          <ul className="trail-milestones">
            {step.milestones.map((m) => (
              <li key={m.label} className={m.done ? 'done' : ''}>
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>{m.label}</span>
              </li>
            ))}
          </ul>
          {step.navigateTo ? (
            <Button variant="ghost" size="sm" onClick={() => onNavigate(step.navigateTo!)}>
              {step.navigateLabel} <ChevronRight size={14} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TherapeuticTrail({
  data,
  onNavigate,
}: {
  data: PatientDetailData
  onNavigate: (tab: WorkspaceTab) => void
}) {
  const genogramQuery = useQuery({
    queryKey: ['patient-genogram', data.patient.id],
    queryFn: () => getPatientGenogram(data.patient.id),
  })
  const genogramPersonCount = genogramQuery.data?.persons.length ?? 0

  const steps = buildSteps(data, genogramPersonCount)

  // Open the first in-progress step by default
  const defaultOpen = steps.find((s) => s.availability === 'inProgress')?.id ?? steps[0]?.id ?? null
  const [openId, setOpenId] = useState<string | null>(defaultOpen)

  const mainSteps = steps.filter((s) => !s.isLateral)
  const doneCount = mainSteps.filter((s) => s.availability === 'completed').length
  const inProgCount = mainSteps.filter((s) => s.availability === 'inProgress').length
  const progressPct = Math.round((doneCount / mainSteps.length) * 100)

  return (
    <div className="therapeutic-trail">
      <div className="trail-header">
        <div>
          <h3>Jornada do paciente</h3>
          <p>
            {doneCount} concluído{doneCount !== 1 ? 's' : ''} · {inProgCount} em andamento · {progressPct}% do percurso principal
          </p>
        </div>
        <div className="trail-progress-ring" aria-label={`${progressPct}% concluído`} style={{ '--pct': progressPct } as React.CSSProperties}>
          <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
            <circle cx="22" cy="22" r="18" />
            <circle cx="22" cy="22" r="18" className="trail-ring-fill" />
          </svg>
          <span>{progressPct}%</span>
        </div>
      </div>

      {/* Phase strip */}
      <PhaseStrip steps={steps} />

      {/* Steps grouped by phase */}
      {PHASES.map((phase) => {
        const phaseSteps = steps.filter((s) => s.phase === phase.id)
        if (!phaseSteps.length) return null
        return (
          <section key={phase.id} className="journey-phase-section">
            <div className="journey-phase-heading">
              <span className="journey-phase-name">{phase.label}</span>
              <span className="journey-phase-subtitle">{phase.subtitle}</span>
            </div>
            <div className="journey-phase-steps">
              {phaseSteps.map((step) => (
                <StepCard
                  key={step.id}
                  step={step}
                  isOpen={openId === step.id}
                  onToggle={() => setOpenId(openId === step.id ? null : step.id)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
