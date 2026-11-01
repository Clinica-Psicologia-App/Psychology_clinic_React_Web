import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, BarChart3, ClipboardCheck, HeartPulse, Printer, Target } from 'lucide-react'
import { Badge, DataState, PageHeader } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { average, MetricBar, ProgressRing } from '../components/clinical/PatientInfographicPanel'
import { useEntitlements } from '../context/entitlements'
import {
  getPatientPortalGenogram,
  getPatientPortalInitialAssessment,
  getPatientPortalMonitoring,
  getPatientPortalPlan,
  getPatientPortalResults,
  getPatientPortalTimeline,
} from '../services/supabaseQueries'

type StepStatus = 'completed' | 'inProgress' | 'available' | 'notStarted'

type Step = {
  id: string
  title: string
  subtitle: string
  phase: string
  status: StepStatus
  hint?: string
  to?: string
  feature?: string
}

const PHASES = [
  { id: 'conhecer', label: 'Conhecer', subtitle: 'Sua história e contexto' },
  { id: 'avaliar', label: 'Avaliar', subtitle: 'Instrumentos e resultados' },
  { id: 'compreender', label: 'Compreender', subtitle: 'Entendendo o quadro' },
  { id: 'intervir', label: 'Intervir', subtitle: 'Plano e recursos' },
  { id: 'acompanhar', label: 'Acompanhar', subtitle: 'Evolução ao longo do tempo' },
]

const STATUS_META: Record<StepStatus, { label: string; tone: 'success' | 'info' | 'neutral' | 'warning' }> = {
  completed: { label: 'Concluído', tone: 'success' },
  inProgress: { label: 'Em andamento', tone: 'info' },
  available: { label: 'Disponível', tone: 'neutral' },
  notStarted: { label: 'Não iniciado', tone: 'warning' },
}

function countHint(count: number, singular: string, plural: string) {
  return count ? `${count} ${count === 1 ? singular : plural}` : undefined
}

export function PatientJourneyPage() {
  const { isFeatureEnabled } = useEntitlements()
  const query = useQuery({
    queryKey: ['patient-portal-journey'],
    queryFn: async () => {
      const [assessment, results, monitoring, plan, timeline, genogram] = await Promise.all([
        getPatientPortalInitialAssessment(),
        getPatientPortalResults(),
        getPatientPortalMonitoring(),
        getPatientPortalPlan(),
        getPatientPortalTimeline(),
        getPatientPortalGenogram(),
      ])
      return { assessment, results, monitoring, plan, timeline, genogram }
    },
  })

  const data = query.data

  const steps: Step[] = []
  let continuity = 0
  let activeProblems = 0
  let activeGoals = 0
  let touchpoints = 0
  const recent = data?.monitoring.checkIns.slice(0, 5) ?? []

  if (data) {
    const { assessment, results, monitoring, plan, timeline, genogram } = data
    const released = Boolean(results.patient.results_released_at)
    const filled = [assessment.intake_summary, assessment.current_life_context, assessment.therapy_demands].filter(Boolean).length
    const completedQuestionnaires = results.responses.length
    activeProblems = plan.problems.filter((p) => p.status === 'active').length
    activeGoals = plan.goals.filter((g) => g.status === 'active').length
    touchpoints = completedQuestionnaires + plan.problems.length + plan.goals.length + timeline.length + monitoring.checkIns.length + monitoring.dailyMonitors.length
    continuity = Math.min(
      100,
      20 + (timeline.length ? 15 : 0) + (monitoring.checkIns.length ? 20 : 0) + (monitoring.dailyMonitors.length ? 15 : 0) + (completedQuestionnaires ? 30 : 0),
    )

    steps.push(
      { id: 'assessment', title: 'Conhecendo você', subtitle: 'Seus dados e contexto clínico.', phase: 'conhecer', status: filled === 3 ? 'completed' : filled > 0 ? 'inProgress' : 'notStarted', hint: `${filled}/3 campos`, to: '/minha-avaliacao-inicial' },
      { id: 'timeline', title: 'Linha do tempo', subtitle: 'Eventos importantes da sua vida.', phase: 'conhecer', status: timeline.length ? 'inProgress' : 'notStarted', hint: countHint(timeline.length, 'evento', 'eventos'), to: '/minha-linha-do-tempo' },
      { id: 'genogram', title: 'Genograma e família', subtitle: 'Pessoas e relações importantes.', phase: 'conhecer', status: genogram.persons.length ? 'inProgress' : 'notStarted', hint: countHint(genogram.persons.length, 'pessoa', 'pessoas'), to: '/meu-genograma', feature: 'genogram' },
      { id: 'psychoeducation', title: 'Psicoeducação', subtitle: 'Conteúdos para entender o processo.', phase: 'conhecer', status: 'available', to: '/minha-psicoeducacao', feature: 'psychoeducation' },
      { id: 'questionnaires', title: 'Questionários', subtitle: 'Instrumentos indicados pelo seu psicólogo.', phase: 'avaliar', status: completedQuestionnaires ? 'inProgress' : 'notStarted', hint: countHint(completedQuestionnaires, 'concluído', 'concluídos'), to: '/meus-questionarios', feature: 'questionnaires' },
      { id: 'results', title: 'Resultados', subtitle: 'Liberados após revisão do psicólogo.', phase: 'avaliar', status: released ? 'completed' : 'notStarted', hint: released ? 'Liberados' : 'Aguardando liberação', to: '/meus-resultados', feature: 'questionnaires' },
      { id: 'personality', title: 'Personalidade e modos', subtitle: 'Referências sobre como você funciona.', phase: 'compreender', status: 'available', to: '/minha-personalidade', feature: 'personality' },
      { id: 'problems', title: 'Problemas em foco', subtitle: 'Definidos junto com seu psicólogo.', phase: 'intervir', status: plan.problems.length ? 'inProgress' : 'notStarted', hint: countHint(activeProblems, 'ativo', 'ativos') },
      { id: 'goals', title: 'Metas terapêuticas', subtitle: 'Onde você quer chegar.', phase: 'intervir', status: plan.goals.length ? 'inProgress' : 'notStarted', hint: countHint(activeGoals, 'ativa', 'ativas') },
      { id: 'resources', title: 'Recursos e biblioteca', subtitle: 'Materiais indicados para você.', phase: 'intervir', status: 'available', to: '/meus-recursos', feature: 'resources' },
      { id: 'monitoring', title: 'Check-ins e monitores', subtitle: 'Acompanhamento entre as sessões.', phase: 'acompanhar', status: monitoring.checkIns.length ? 'inProgress' : 'notStarted', hint: countHint(monitoring.checkIns.length + monitoring.dailyMonitors.length, 'registro', 'registros'), to: '/meu-acompanhamento' },
    )
  }

  const visibleSteps = steps.filter((step) => !step.feature || isFeatureEnabled(step.feature))
  const mood = average(recent.map((item) => item.mood_score))
  const energy = average(recent.map((item) => item.energy_score))
  const anxiety = average(recent.map((item) => item.anxiety_score))
  const intensity = average(recent.map((item) => item.problem_intensity_score))

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Minha jornada"
        description="Seu caminho na terapia, em etapas. Somente leitura."
        action={<Button variant="ghost" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Imprimir ou salvar PDF</Button>}
      />

      <DataState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {data ? (
          <>
            <article className="panel patient-infographic-panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Infográfico</span>
                  <h2>Síntese visual do meu acompanhamento</h2>
                  <p>Indicadores para leitura rápida. Não substitui a avaliação clínica.</p>
                </div>
                <BarChart3 size={20} aria-hidden="true" />
              </div>
              <div className="infographic-grid">
                <section className="infographic-hero">
                  <ProgressRing value={continuity} label="continuidade" />
                  <div>
                    <strong>{data.assessment.full_name}</strong>
                    <span>{visibleSteps.filter((s) => s.status === 'completed').length} de {visibleSteps.length} etapas concluídas</span>
                  </div>
                </section>
                <section className="infographic-kpi">
                  <ClipboardCheck size={20} aria-hidden="true" />
                  <strong>{data.results.responses.length}</strong>
                  <span>questionários concluídos</span>
                </section>
                <section className="infographic-kpi">
                  <Target size={20} aria-hidden="true" />
                  <strong>{activeProblems}/{activeGoals}</strong>
                  <span>problemas e metas ativos</span>
                </section>
                <section className="infographic-kpi">
                  <Activity size={20} aria-hidden="true" />
                  <strong>{touchpoints}</strong>
                  <span>registros no total</span>
                </section>
                <section className="infographic-card">
                  <div><HeartPulse size={18} aria-hidden="true" /><strong>Sinais recentes</strong></div>
                  <MetricBar label="Humor" value={mood} tone="good" />
                  <MetricBar label="Energia" value={energy} tone="good" />
                  <MetricBar label="Ansiedade" value={anxiety} tone="attention" />
                  <MetricBar label="Intensidade" value={intensity} tone="attention" />
                </section>
              </div>
            </article>

            {PHASES.map((phase) => {
              const phaseSteps = visibleSteps.filter((step) => step.phase === phase.id)
              if (!phaseSteps.length) return null
              return (
                <article className="panel" key={phase.id}>
                  <div className="panel-header">
                    <div>
                      <span className="eyebrow">{phase.label}</span>
                      <h2>{phase.subtitle}</h2>
                    </div>
                  </div>
                  <div className="executive-list">
                    {phaseSteps.map((step) => {
                      const meta = STATUS_META[step.status]
                      return (
                        <div key={step.id}>
                          <strong>{step.title}</strong>
                          <span>
                            {step.subtitle}{step.hint ? ` · ${step.hint}` : ''}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            {step.to ? <Link to={step.to}>Abrir <ArrowRight size={13} aria-hidden="true" /></Link> : null}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </>
        ) : null}
      </DataState>
    </div>
  )
}
