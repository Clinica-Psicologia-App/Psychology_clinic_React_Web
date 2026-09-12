import { BrainCircuit, CalendarClock, HeartPulse, Target } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import type { PatientDetailData } from '../../types'

function latest<T>(items: T[], fallback: string, read: (item: T) => string | null | undefined) {
  const item = items[0]
  return item ? read(item) || fallback : fallback
}

export function PatientMentalMapSummary({ data }: { data: PatientDetailData }) {
  const hasCore = Boolean(data.patient.intake_summary || data.patient.current_life_context || data.patient.therapy_demands)
  const hasMapSource = hasCore || data.problems.length || data.goals.length || data.timelineEvents.length || data.checkIns.length || data.dailyMonitors.length

  if (!hasMapSource) {
    return (
      <article className="panel report-table-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Mapa mental</span>
            <h2>Mapa clínico agregado</h2>
            <p>Fonte consolidada do caso para leitura rápida.</p>
          </div>
          <BrainCircuit size={20} aria-hidden="true" />
        </div>
        <EmptyState
          icon={BrainCircuit}
          title="Mapa mental ainda sem fonte"
          description="Preencha avaliação inicial, problemas, metas ou timeline para formar a síntese."
        />
      </article>
    )
  }

  const activeProblems = data.problems.filter((problem) => problem.status === 'active')
  const activeGoals = data.goals.filter((goal) => goal.status === 'active')

  return (
    <article className="panel report-table-panel mental-map-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Mapa mental</span>
          <h2>Mapa clínico agregado</h2>
          <p>Leitura sintética alimentada por avaliação inicial, problemas, metas, timeline e monitoramento.</p>
        </div>
        <BrainCircuit size={20} aria-hidden="true" />
      </div>

      <div className="mental-map-grid">
        <section className="mental-map-core">
          <BrainCircuit size={24} aria-hidden="true" />
          <strong>{data.patient.full_name}</strong>
          <span>{data.patient.therapy_demands || data.patient.intake_summary || 'Caso em construção'}</span>
        </section>
        <section>
          <div><Target size={18} aria-hidden="true" /><strong>Plano terapêutico</strong></div>
          <p>{activeProblems.length} problema(s) ativo(s) e {activeGoals.length} meta(s) ativa(s).</p>
          <div className="context-progress-list">
            {activeProblems.slice(0, 3).map((problem) => <Badge key={problem.id} tone="danger">{problem.title}</Badge>)}
            {activeGoals.slice(0, 3).map((goal) => <Badge key={goal.id} tone="info">{goal.title}</Badge>)}
          </div>
        </section>
        <section>
          <div><CalendarClock size={18} aria-hidden="true" /><strong>História e contexto</strong></div>
          <p>{latest(data.timelineEvents, data.patient.current_life_context || 'Sem evento principal registrado.', (event) => event.title)}</p>
          <span>{data.timelineEvents.length} evento(s) estruturado(s)</span>
        </section>
        <section>
          <div><HeartPulse size={18} aria-hidden="true" /><strong>Monitoramento recente</strong></div>
          <p>{latest(data.checkIns, 'Sem check-in recente.', (checkIn) => checkIn.notes || `Humor ${checkIn.mood_score ?? '-'}/10, ansiedade ${checkIn.anxiety_score ?? '-'}/10`)}</p>
          <span>{data.checkIns.length + data.dailyMonitors.length} registro(s) de acompanhamento</span>
        </section>
      </div>
    </article>
  )
}
