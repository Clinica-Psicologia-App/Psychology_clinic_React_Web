import { useState } from 'react'
import {
  Activity, BookOpenCheck, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardCheck, Flag, HeartPulse, LockKeyhole, Sparkles, Target,
} from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import type { PatientDetailData } from '../../types'

type WorkspaceTab = 'map' | 'timeline' | 'session' | 'journey' | 'resources'

type Milestone = {
  label: string
  done: boolean
}

type Stage = {
  id: string
  label: string
  icon: React.ElementType
  detail: string
  done: boolean
  locked: boolean
  milestones: Milestone[]
  navigateTo?: WorkspaceTab
  navigateLabel?: string
}

function buildStages(data: PatientDetailData): Stage[] {
  const s1done = Boolean(data.patient.birth_date || data.patient.occupation)
  const s2done = data.timelineEvents.length > 0
  const s3done = data.goals.length > 0
  const s4done = data.resources.some((r) => r.is_released)
  const s5done = data.checkIns.length + data.dailyMonitors.length > 0
  const s6done = data.totals.completedResponses > 1

  const doneFlags = [s1done, s2done, s3done, s4done, s5done, s6done]

  const raw: Array<Omit<Stage, 'locked'>> = [
    {
      id: 'avaliacao',
      label: 'Avaliação inicial',
      icon: ClipboardCheck,
      detail: 'Cadastro do paciente e contexto clínico inicial.',
      done: s1done,
      milestones: [
        { label: 'Nome e dados básicos', done: Boolean(data.patient.full_name) },
        { label: 'Data de nascimento', done: Boolean(data.patient.birth_date) },
        { label: 'Ocupação / contexto', done: Boolean(data.patient.occupation) },
        { label: 'Queixa principal', done: Boolean(data.patient.main_complaint) },
      ],
      navigateTo: 'map',
      navigateLabel: 'Ver mapa clínico',
    },
    {
      id: 'formulacao',
      label: 'Formulação do caso',
      icon: Flag,
      detail: 'Mapeamento de história de vida, relações e eventos significativos.',
      done: s2done,
      milestones: [
        { label: 'Eventos de vida registrados', done: data.timelineEvents.length > 0 },
        { label: 'Pelo menos 3 eventos mapeados', done: data.timelineEvents.length >= 3 },
        { label: 'Genograma iniciado', done: Boolean((data as unknown as Record<string, unknown>).genogramPersons) },
      ],
      navigateTo: 'timeline',
      navigateLabel: 'Ver linha do tempo',
    },
    {
      id: 'objetivos',
      label: 'Objetivos terapêuticos',
      icon: Target,
      detail: 'Definição de metas claras e acompanháveis para a jornada.',
      done: s3done,
      milestones: [
        { label: 'Pelo menos 1 objetivo ativo', done: data.totals.activeGoals > 0 },
        { label: 'Pelo menos 2 objetivos', done: data.goals.length >= 2 },
        { label: '1 objetivo concluído', done: data.goals.some((g) => g.status === 'completed') },
      ],
      navigateTo: 'journey',
      navigateLabel: 'Adicionar objetivo',
    },
    {
      id: 'intervencao',
      label: 'Intervenção',
      icon: BookOpenCheck,
      detail: 'Liberação de recursos e protocolos terapêuticos personalizados.',
      done: s4done,
      milestones: [
        { label: 'Pelo menos 1 recurso liberado', done: data.resources.some((r) => r.is_released) },
        { label: 'Instrumento aplicado', done: data.totals.completedResponses > 0 },
        { label: 'Questionário de personalidade', done: data.responses.some((r) => r.questionnaire_name?.toLowerCase().includes('esquema') || r.questionnaire_name?.toLowerCase().includes('yami')) },
      ],
      navigateTo: 'resources',
      navigateLabel: 'Ver biblioteca',
    },
    {
      id: 'monitoramento',
      label: 'Monitoramento contínuo',
      icon: HeartPulse,
      detail: 'Check-ins e monitores diários acompanham a evolução entre sessões.',
      done: s5done,
      milestones: [
        { label: 'Primeiro check-in registrado', done: data.checkIns.length > 0 },
        { label: 'Pelo menos 5 check-ins', done: data.checkIns.length >= 5 },
        { label: 'Monitor diário ativo', done: data.dailyMonitors.length > 0 },
        { label: 'Dados de tendência disponíveis', done: data.checkIns.length >= 2 },
      ],
      navigateTo: 'map',
      navigateLabel: 'Ver indicadores',
    },
    {
      id: 'reavaliacao',
      label: 'Reavaliação',
      icon: Activity,
      detail: 'Reaplicação de instrumentos para medir progresso e ajustar intervenção.',
      done: s6done,
      milestones: [
        { label: 'Instrumento reaplicado', done: data.totals.completedResponses > 1 },
        { label: 'Evolução de scores disponível', done: data.totals.completedResponses >= 2 },
        { label: '3 ou mais avaliações', done: data.totals.completedResponses >= 3 },
      ],
      navigateTo: 'session',
      navigateLabel: 'Preparar sessão',
    },
  ]

  return raw.map((stage, index) => ({
    ...stage,
    locked: index > 0 && !doneFlags[index - 1],
  }))
}

function stageState(stage: Stage, isCurrent: boolean): 'done' | 'current' | 'locked' | 'pending' {
  if (stage.done) return 'done'
  if (stage.locked) return 'locked'
  if (isCurrent) return 'current'
  return 'pending'
}

export function TherapeuticTrail({
  data,
  onNavigate,
}: {
  data: PatientDetailData
  onNavigate: (tab: WorkspaceTab) => void
}) {
  const stages = buildStages(data)
  const currentIndex = stages.findIndex((s) => !s.done && !s.locked)
  const [openId, setOpenId] = useState<string | null>(stages[currentIndex]?.id ?? null)
  const doneCount = stages.filter((s) => s.done).length
  const progressPct = Math.round((doneCount / stages.length) * 100)

  return (
    <div className="therapeutic-trail">
      <div className="trail-header">
        <div>
          <h3>Jornada terapêutica</h3>
          <p>
            {doneCount} de {stages.length} etapas concluídas · {progressPct}% do percurso
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

      <div className="trail-track">
        {stages.map((stage, index) => {
          const isCurrent = index === currentIndex
          const state = stageState(stage, isCurrent)
          const Icon = stage.icon
          const isOpen = openId === stage.id
          const milestoneDone = stage.milestones.filter((m) => m.done).length
          const isLast = index === stages.length - 1

          return (
            <div key={stage.id} className={`trail-stage trail-stage--${state}`}>
              {/* Connector line */}
              {!isLast ? <div className={`trail-connector${stage.done ? ' done' : ''}`} aria-hidden="true" /> : null}

              <div className="trail-stage-row">
                {/* Node */}
                <div className="trail-node" aria-hidden="true">
                  {state === 'done' ? <CheckCircle2 size={18} /> : state === 'locked' ? <LockKeyhole size={15} /> : state === 'current' ? <Sparkles size={16} /> : <span>{index + 1}</span>}
                </div>

                {/* Content */}
                <button
                  type="button"
                  className="trail-stage-header"
                  onClick={() => !stage.locked && setOpenId(isOpen ? null : stage.id)}
                  disabled={stage.locked}
                  aria-expanded={isOpen}
                >
                  <span className="trail-stage-icon"><Icon size={16} aria-hidden="true" /></span>
                  <div className="trail-stage-meta">
                    <strong>{stage.label}</strong>
                    <span>{stage.locked ? 'Complete a etapa anterior para desbloquear.' : stage.detail}</span>
                  </div>
                  <div className="trail-stage-badges">
                    {state === 'current' ? <Badge tone="info">Etapa atual</Badge> : null}
                    {state === 'locked' ? <Badge tone="neutral">Bloqueada</Badge> : null}
                    {!stage.locked ? (
                      <span className="trail-milestone-count" title={`${milestoneDone}/${stage.milestones.length} marcos`}>
                        {milestoneDone}/{stage.milestones.length}
                      </span>
                    ) : null}
                    {!stage.locked ? (isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : null}
                  </div>
                </button>
              </div>

              {/* Expanded milestones */}
              {isOpen && !stage.locked ? (
                <div className="trail-stage-body">
                  <ul className="trail-milestones">
                    {stage.milestones.map((m) => (
                      <li key={m.label} className={m.done ? 'done' : ''}>
                        <CheckCircle2 size={14} aria-hidden="true" />
                        <span>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                  {stage.navigateTo ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(stage.navigateTo!)}
                    >
                      {stage.navigateLabel} <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {/* Locked placeholder */}
              {stage.locked ? (
                <div className="trail-locked-placeholder">
                  <LockKeyhole size={14} aria-hidden="true" />
                  <span>Conclua <em>{stages[index - 1]?.label}</em> para desbloquear esta etapa.</span>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
