import { useQueries } from '@tanstack/react-query'
import { CheckCircle2, Circle, ClipboardList } from 'lucide-react'
import {
  getPatientGenogram,
  getPatientIntake,
  getPatientClinicalIntake,
  listPatientLifeAreas,
  getCaseConceptualization,
  getPatientFamilyContext,
  listPersonalityAssessments,
} from '../../services/supabaseQueries'
import type { PatientDetailData } from '../../types'

type Section = { label: string; done: boolean }

export function PatientCompletenessPanel({ data }: { data: PatientDetailData }) {
  const pid = data.patient.id

  const [genogram, intake, clinicalIntake, lifeAreas, conceptualization, familyContext, personality] = useQueries({
    queries: [
      { queryKey: ['patient-genogram', pid], queryFn: () => getPatientGenogram(pid) },
      { queryKey: ['patient-intake', pid], queryFn: () => getPatientIntake(pid) },
      { queryKey: ['patient-clinical-intake', pid], queryFn: () => getPatientClinicalIntake(pid) },
      { queryKey: ['patient-life-areas', pid], queryFn: () => listPatientLifeAreas(pid) },
      { queryKey: ['case-conceptualization', pid], queryFn: () => getCaseConceptualization(pid) },
      { queryKey: ['patient-family-context', pid], queryFn: () => getPatientFamilyContext(pid) },
      { queryKey: ['personality-assessments', pid], queryFn: () => listPersonalityAssessments(pid) },
    ],
  })

  const sections: Section[] = [
    { label: 'Avaliação inicial (paciente)', done: Boolean(intake.data) },
    { label: 'Intake clínico (terapeuta)', done: Boolean(clinicalIntake.data) },
    { label: 'Áreas de vida', done: (lifeAreas.data ?? []).length > 0 },
    { label: 'Formulação de caso', done: Boolean(conceptualization.data) },
    { label: 'Genograma', done: (genogram.data?.persons ?? []).length > 0 },
    { label: 'Contexto familiar', done: Boolean(familyContext.data) },
    { label: 'Personalidade', done: (personality.data ?? []).length > 0 },
    { label: 'Problemas clínicos', done: data.problems.length > 0 },
    { label: 'Metas terapêuticas', done: data.goals.length > 0 },
    { label: 'Linha do tempo', done: data.timelineEvents.length > 0 },
    { label: 'Questionários', done: data.totals.responses > 0 },
  ]

  const done = sections.filter((s) => s.done).length
  const total = sections.length
  const pct = Math.round((done / total) * 100)

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Prontuário</span>
          <h2>Completude clínica</h2>
          <p>Checklist das seções do prontuário preenchidas no aplicativo e no painel.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--weight-bold)', color: pct === 100 ? 'var(--success)' : 'var(--color-brand-navy)' }}>
            {done}/{total}
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>{pct}% completo</div>
        </div>
      </div>

      <div className="completeness-progress-bar">
        <div className="completeness-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="completeness-grid">
        {sections.map((s) => (
          <div key={s.label} className={`completeness-item ${s.done ? 'done' : 'missing'}`}>
            {s.done
              ? <CheckCircle2 size={15} aria-hidden="true" />
              : <Circle size={15} aria-hidden="true" />}
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {done === total && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--success-soft, #f0fdf4)', borderRadius: 'var(--radius-lg)', marginTop: 'var(--space-3)', fontSize: 'var(--text-supporting)', color: 'var(--success)' }}>
          <ClipboardList size={15} /> Prontuário completo — todas as seções foram preenchidas.
        </div>
      )}
    </article>
  )
}
