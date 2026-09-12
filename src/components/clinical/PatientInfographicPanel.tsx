import { Activity, BarChart3, ClipboardCheck, HeartPulse, Route, Sparkles, Target } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import type { PatientDetailData } from '../../types'

function pct(part: number, total: number) {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number')
  return valid.length ? Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10 : null
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  return (
    <div className="infographic-ring" style={{ background: `conic-gradient(var(--color-brand-accent) ${value * 3.6}deg, var(--bg-muted) 0deg)` }}>
      <div>
        <strong>{value}%</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

function MetricBar({ label, value, max = 10, tone = 'default' }: {
  label: string
  value: number | null
  max?: number
  tone?: 'default' | 'attention' | 'good'
}) {
  const normalized = value == null ? 0 : pct(value, max)
  return (
    <div className={`infographic-bar ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value ?? '-'}/{max}</strong>
      </div>
      <i><b style={{ width: `${normalized}%` }} /></i>
    </div>
  )
}

export function PatientInfographicPanel({ data }: { data: PatientDetailData }) {
  const recentCheckIns = data.checkIns.slice(0, 5)
  const completionRate = pct(data.totals.completedResponses, data.totals.responses)
  const activeProblems = data.problems.filter((problem) => problem.status === 'active')
  const activeGoals = data.goals.filter((goal) => goal.status === 'active')
  const resolvedProblems = data.problems.filter((problem) => problem.status === 'resolved')
  const completedGoals = data.goals.filter((goal) => goal.status === 'completed')
  const planBalance = pct(resolvedProblems.length + completedGoals.length, Math.max(1, data.problems.length + data.goals.length))
  const continuityScore = Math.min(100, 20 + (data.timelineEvents.length ? 15 : 0) + (data.checkIns.length ? 20 : 0) + (data.dailyMonitors.length ? 15 : 0) + Math.round(completionRate * .3))
  const mood = average(recentCheckIns.map((item) => item.mood_score))
  const anxiety = average(recentCheckIns.map((item) => item.anxiety_score))
  const energy = average(recentCheckIns.map((item) => item.energy_score))
  const intensity = average(recentCheckIns.map((item) => item.problem_intensity_score))
  const touchpoints = data.responses.length + data.goals.length + data.problems.length + data.timelineEvents.length + data.checkIns.length + data.dailyMonitors.length

  return (
    <article className="panel patient-infographic-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Infográfico do paciente</span>
          <h2>Síntese visual do acompanhamento</h2>
          <p>Indicadores operacionais para leitura rápida do caso. Não substitui avaliação clínica.</p>
        </div>
        <BarChart3 size={20} aria-hidden="true" />
      </div>

      <div className="infographic-grid">
        <section className="infographic-hero">
          <ProgressRing value={continuityScore} label="continuidade" />
          <div>
            <strong>{data.patient.full_name}</strong>
            <span>{data.clinic?.name ?? 'Clínica não informada'} · {data.psychologist?.full_name ?? 'Sem responsável'}</span>
            <div className="context-progress-list">
              <Badge tone={data.patient.is_active ? 'success' : 'neutral'}>{data.patient.is_active ? 'Ativo' : 'Inativo'}</Badge>
              <Badge tone={data.patient.profile_id ? 'info' : 'neutral'}>{data.patient.profile_id ? 'Com acesso' : 'Sem acesso'}</Badge>
            </div>
          </div>
        </section>

        <section className="infographic-kpi">
          <ClipboardCheck size={20} aria-hidden="true" />
          <strong>{completionRate}%</strong>
          <span>questionários concluídos</span>
        </section>
        <section className="infographic-kpi">
          <Target size={20} aria-hidden="true" />
          <strong>{activeProblems.length}/{activeGoals.length}</strong>
          <span>problemas e metas ativos</span>
        </section>
        <section className="infographic-kpi">
          <Activity size={20} aria-hidden="true" />
          <strong>{touchpoints}</strong>
          <span>pontos estruturados</span>
        </section>

        <section className="infographic-card">
          <div><HeartPulse size={18} aria-hidden="true" /><strong>Sinais recentes</strong></div>
          <MetricBar label="Humor" value={mood} tone="good" />
          <MetricBar label="Energia" value={energy} tone="good" />
          <MetricBar label="Ansiedade" value={anxiety} tone="attention" />
          <MetricBar label="Intensidade" value={intensity} tone="attention" />
        </section>

        <section className="infographic-card">
          <div><Route size={18} aria-hidden="true" /><strong>Jornada clínica</strong></div>
          <div className="infographic-stage-list">
            <span className={data.patient.intake_summary || data.patient.therapy_demands ? 'done' : ''}>Avaliação inicial</span>
            <span className={data.timelineEvents.length ? 'done' : ''}>História</span>
            <span className={data.problems.length ? 'done' : ''}>Problemas</span>
            <span className={data.goals.length ? 'done' : ''}>Metas</span>
            <span className={data.checkIns.length || data.dailyMonitors.length ? 'done' : ''}>Monitoramento</span>
          </div>
        </section>

        <section className="infographic-card">
          <div><Sparkles size={18} aria-hidden="true" /><strong>Plano terapêutico</strong></div>
          <div className="infographic-plan-meter">
            <i><b style={{ width: `${planBalance}%` }} /></i>
            <span>{planBalance}% entre resoluções e metas concluídas</span>
          </div>
          <p>{completedGoals.length} meta(s) concluída(s), {resolvedProblems.length} problema(s) resolvido(s).</p>
        </section>
      </div>
    </article>
  )
}
