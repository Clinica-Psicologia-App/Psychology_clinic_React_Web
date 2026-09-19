/**
 * Avaliação inicial completa — espelha os 4 blocos preenchidos no app Flutter:
 * Bloco 1 (queixa do paciente), Bloco 2 (intake clínico do terapeuta),
 * Bloco 3 (áreas de vida), Bloco 4 (impressões clínicas).
 * Somente leitura no painel web.
 */
import { useQuery } from '@tanstack/react-query'
import { Activity, Brain, ClipboardList, Heart, RefreshCw } from 'lucide-react'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '../design-system/EmptyState'
import {
  getPatientClinicalImpressions,
  getPatientClinicalIntake,
  getPatientIntake,
  listPatientLifeAreaNotes,
  listPatientLifeAreas,
} from '../../services/supabaseQueries'
import type { PatientDetailData, PatientLifeAreaNoteRow, PatientLifeAreaRow } from '../../types'

// ── Rótulos das áreas de vida (mesmas chaves do Flutter) ─────────────────────
const LIFE_AREA_LABELS: Record<string, string> = {
  work: 'Trabalho / Estudo',
  family: 'Família',
  romantic: 'Relacionamento afetivo',
  social: 'Vida social',
  health: 'Saúde e bem-estar',
  leisure: 'Lazer e prazer',
  personal_growth: 'Crescimento pessoal',
  spirituality: 'Espiritualidade',
  finances: 'Finanças',
}

function LifeAreaBar({ area, clinicalNote }: { area: PatientLifeAreaRow; clinicalNote?: string | null }) {
  const label = LIFE_AREA_LABELS[area.area_key] ?? area.area_key
  const score = area.score ?? 0
  const suffering = area.suffering ?? 0
  const pct = Math.round((score / 10) * 100)
  const sufPct = Math.round((suffering / 10) * 100)

  return (
    <div className="life-area-row">
      <span className="life-area-label">{label}</span>
      <div className="life-area-bars">
        <div className="life-area-bar-wrap" title={`Satisfação: ${score}/10`}>
          <div className="life-area-bar satisfaction" style={{ width: `${pct}%` }} />
          <span>{score}</span>
        </div>
        <div className="life-area-bar-wrap" title={`Sofrimento: ${suffering}/10`}>
          <div className="life-area-bar suffering" style={{ width: `${sufPct}%` }} />
          <span>{suffering}</span>
        </div>
      </div>
      {area.guided_answer && (
        <p className="life-area-note">{area.guided_answer}</p>
      )}
      {clinicalNote && (
        <p className="life-area-note" style={{ color: 'var(--color-brand-navy)', fontStyle: 'italic' }}>💬 {clinicalNote}</p>
      )}
    </div>
  )
}

function TextField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="assessment-field">
      <span className="assessment-field-label">{label}</span>
      <p>{value}</p>
    </div>
  )
}

export function PatientInitialAssessmentPanel({ data }: { data: PatientDetailData }) {
  const patientId = data.patient.id

  const intake = useQuery({ queryKey: ['patient-intake', patientId], queryFn: () => getPatientIntake(patientId) })
  const clinicalIntake = useQuery({ queryKey: ['patient-clinical-intake', patientId], queryFn: () => getPatientClinicalIntake(patientId) })
  const lifeAreas = useQuery({ queryKey: ['patient-life-areas', patientId], queryFn: () => listPatientLifeAreas(patientId) })
  const lifeAreaNotes = useQuery({ queryKey: ['patient-life-area-notes', patientId], queryFn: () => listPatientLifeAreaNotes(patientId) })
  const impressions = useQuery({ queryKey: ['patient-clinical-impressions', patientId], queryFn: () => getPatientClinicalImpressions(patientId) })

  const notesByArea = (lifeAreaNotes.data ?? []).reduce<Record<string, string | null>>((acc, n: PatientLifeAreaNoteRow) => {
    acc[n.area_key] = n.clinical_comment ?? null
    return acc
  }, {})

  const hasAny = intake.data || clinicalIntake.data || (lifeAreas.data ?? []).length > 0 || impressions.data

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Avaliação</span>
          <h2>Avaliação inicial</h2>
          <p>Queixa, contexto de vida, áreas funcionais e impressões clínicas da triagem.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
          <RefreshCw size={13} /> Preenchido no aplicativo
        </div>
      </div>

      {!hasAny && !intake.isLoading ? (
        <EmptyState
          icon={ClipboardList}
          title="Avaliação ainda não preenchida"
          description="Os dados da triagem aparecerão aqui assim que forem preenchidos no aplicativo."
        />
      ) : (
        <div className="assessment-blocks">

          {/* Bloco 1 — Queixa do paciente */}
          {intake.data && (
            <section className="assessment-block">
              <h3><Heart size={15} /> O que está acontecendo (paciente)</h3>
              <TextField label="Motivo da busca" value={intake.data.reason_for_seeking} />
              <TextField label="Duração do problema" value={intake.data.problem_duration} />
              <TextField label="Principal desconforto" value={intake.data.main_discomfort} />
              <TextField label="Expectativas" value={intake.data.expectations} />
              <TextField label="Evento relacionado" value={intake.data.related_event} />
            </section>
          )}

          {/* Bloco 2 — Intake clínico (terapeuta) */}
          {clinicalIntake.data && (
            <section className="assessment-block">
              <h3><ClipboardList size={15} /> Intake clínico (terapeuta)</h3>
              <TextField label="Queixa principal" value={clinicalIntake.data.main_complaint} />
              <TextField label="Problema atual" value={clinicalIntake.data.current_problem} />
              <TextField label="Fatores precipitantes" value={clinicalIntake.data.precipitating_factors} />
              <TextField label="Objetivos do paciente" value={clinicalIntake.data.patient_goals} />
              <TextField label="Motivação" value={clinicalIntake.data.motivation} />
              <TextField label="Hipóteses iniciais" value={clinicalIntake.data.initial_hypotheses} />
              <TextField label="Observações iniciais" value={clinicalIntake.data.initial_observations} />
            </section>
          )}

          {/* Bloco 3 — Áreas de vida */}
          {(lifeAreas.data ?? []).length > 0 && (
            <section className="assessment-block">
              <h3><Activity size={15} /> Áreas de vida</h3>

              {/* Radar chart */}
              <div className="life-areas-radar">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={lifeAreas.data!.map((a) => ({
                    area: LIFE_AREA_LABELS[a.area_key] ?? a.area_key,
                    Satisfação: a.score ?? 0,
                    Sofrimento: a.suffering ?? 0,
                  }))}>
                    <PolarGrid stroke="var(--border-subtle)" />
                    <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Radar name="Satisfação" dataKey="Satisfação" stroke="var(--color-brand-accent)" fill="var(--color-brand-accent)" fillOpacity={0.2} />
                    <Radar name="Sofrimento" dataKey="Sofrimento" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} />
                    <Tooltip contentStyle={{ background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="life-area-legend">
                <span><span className="legend-dot satisfaction" /> Satisfação</span>
                <span><span className="legend-dot suffering" /> Sofrimento</span>
              </div>
              <div className="life-areas-list">
                {lifeAreas.data!.map((a) => <LifeAreaBar key={a.area_key} area={a} clinicalNote={notesByArea[a.area_key]} />)}
              </div>
            </section>
          )}

          {/* Bloco 4 — Impressões clínicas */}
          {impressions.data && (
            <section className="assessment-block">
              <h3><Brain size={15} /> Impressões clínicas</h3>
              <TextField label="Temperamento observado" value={impressions.data.observed_temperament} />
              <TextField label="Vínculo terapêutico" value={impressions.data.therapeutic_bond} />
              <TextField label="Recursos" value={impressions.data.resources} />
              <TextField label="Vulnerabilidades" value={impressions.data.vulnerabilities} />
              <TextField label="Hipóteses" value={impressions.data.hypotheses} />
              <TextField label="Diagnósticos prévios" value={impressions.data.previous_diagnoses} />
              <TextField label="Diagnóstico diferencial" value={impressions.data.differential_diagnosis} />
              <TextField label="Nível de funcionamento" value={impressions.data.functioning_level} />
              <TextField label="Prioridades terapêuticas" value={impressions.data.therapeutic_priorities} />
              <TextField label="Hipóteses de esquemas" value={impressions.data.schema_hypotheses_text} />
              <TextField label="Hipóteses de modos" value={impressions.data.mode_hypotheses_text} />
              <TextField label="Necessidades emocionais" value={impressions.data.emotional_needs_text} />
            </section>
          )}

        </div>
      )}
    </article>
  )
}
