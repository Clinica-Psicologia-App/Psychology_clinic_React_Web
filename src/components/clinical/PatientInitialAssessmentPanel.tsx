/**
 * Avaliação inicial completa — espelha os 4 blocos preenchidos no app Flutter:
 * Bloco 1 (queixa do paciente), Bloco 2 (intake clínico do terapeuta),
 * Bloco 3 (áreas de vida), Bloco 4 (impressões clínicas).
 * Somente leitura no painel web.
 */
import { useQuery } from '@tanstack/react-query'
import { Activity, Brain, ClipboardList, Heart, RefreshCw } from 'lucide-react'
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
  // chaves reais do Flutter
  work_career: 'Trabalho / Carreira',
  love_romance: 'Relacionamento afetivo',
  friends: 'Amizades',
  alone_time: 'Tempo para si',
  physical_health: 'Saúde física',
  emotional_health: 'Saúde emocional',
  self_care: 'Autocuidado',
  routine_organization: 'Rotina e organização',
  family: 'Família',
  // chaves alternativas
  work: 'Trabalho / Estudo',
  romantic: 'Relacionamento afetivo',
  social: 'Vida social',
  health: 'Saúde e bem-estar',
  leisure: 'Lazer e prazer',
  personal_growth: 'Crescimento pessoal',
  spirituality: 'Espiritualidade',
  finances: 'Finanças',
}

// ── Radar animado (Radar E — linha se desenha ao entrar) ─────────────────────
function AnimatedRadarChart({ areas }: { areas: PatientLifeAreaRow[] }) {
  const cx = 150, cy = 150, maxR = 105, maxScore = 10
  const n = areas.length
  if (n < 3) return null

  const angle = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2

  const pt = (score: number, i: number) => ({
    x: cx + (score / maxScore) * maxR * Math.cos(angle(i)),
    y: cy + (score / maxScore) * maxR * Math.sin(angle(i)),
  })

  const labelPt = (i: number) => ({
    x: cx + (maxR + 24) * Math.cos(angle(i)),
    y: cy + (maxR + 24) * Math.sin(angle(i)),
  })

  const poly = (scores: number[]) =>
    scores.map((s, i) => { const p = pt(s, i); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')

  const perim = (scores: number[]) => {
    const pts = scores.map((s, i) => pt(s, i))
    let len = 0
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length]
      len += Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
    }
    return Math.ceil(len) + 60
  }

  const satScores = areas.map(a => a.score ?? 0)
  const sofScores = areas.map(a => a.suffering ?? 0)
  const satP = perim(satScores)

  const rings = [2, 4, 6, 8, 10]

  const textAnchor = (i: number): 'start' | 'end' | 'middle' => {
    const c = Math.cos(angle(i))
    if (c > 0.3) return 'start'
    if (c < -0.3) return 'end'
    return 'middle'
  }

  const splitLabel = (label: string): string[] => {
    if (label.length <= 10) return [label]
    const slash = label.indexOf('/')
    if (slash > 0) return [label.slice(0, slash).trim(), label.slice(slash).trim()]
    const mid = label.lastIndexOf(' ', Math.ceil(label.length / 2) + 4)
    if (mid > 0) return [label.slice(0, mid), label.slice(mid + 1)]
    return [label]
  }

  return (
    <div className="life-areas-radar" style={{ padding: 0 }}>
      <style>{`
        @keyframes radar-draw-sat { to { stroke-dashoffset: 0; } }
        @keyframes radar-fade-sof { from { opacity: 0; } to { opacity: 1; } }
        @keyframes radar-dot-pop  { from { r: 0; opacity: 0; } to { r: 4.5; opacity: 1; } }
        .radar-sat-poly {
          fill: rgba(13,148,136,0.12);
          stroke: #0d9488;
          stroke-width: 2.5;
          stroke-linejoin: round;
          stroke-dasharray: ${satP};
          stroke-dashoffset: ${satP};
          animation: radar-draw-sat 1.4s cubic-bezier(.4,0,.2,1) .2s forwards;
        }
        .radar-sof-poly {
          fill: rgba(249,115,22,0.07);
          stroke: #f97316;
          stroke-width: 1.8;
          stroke-linejoin: round;
          stroke-dasharray: 5 3;
          opacity: 0;
          animation: radar-fade-sof .9s ease .7s forwards;
        }
        .radar-vertex {
          fill: #fff;
          stroke: #0d9488;
          stroke-width: 2;
          animation: radar-dot-pop .3s cubic-bezier(.34,1.56,.64,1) both;
        }
      `}</style>

      <svg
        viewBox="0 0 300 300"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', maxWidth: 360, display: 'block', margin: '0 auto' }}
        aria-label="Gráfico radar de áreas de vida"
        role="img"
      >
        {/* Rings */}
        {rings.map(v => (
          <polygon
            key={v}
            points={areas.map((_, i) => {
              const r = (v / maxScore) * maxR
              return `${(cx + r * Math.cos(angle(i))).toFixed(1)},${(cy + r * Math.sin(angle(i))).toFixed(1)}`
            }).join(' ')}
            fill={v === 10 ? '#fafafa' : 'none'}
            stroke="#f0f0f0"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {areas.map((_, i) => (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={(cx + maxR * Math.cos(angle(i))).toFixed(1)}
            y2={(cy + maxR * Math.sin(angle(i))).toFixed(1)}
            stroke="#ebebeb"
            strokeWidth="1"
          />
        ))}

        {/* Sofrimento — fades in */}
        <polygon className="radar-sof-poly" points={poly(sofScores)} />

        {/* Satisfação — draws on */}
        <polygon className="radar-sat-poly" points={poly(satScores)} />

        {/* Vertex dots */}
        {areas.map((a, i) => {
          const p = pt(a.score ?? 0, i)
          return (
            <circle
              key={i}
              className="radar-vertex"
              cx={p.x.toFixed(1)}
              cy={p.y.toFixed(1)}
              style={{ animationDelay: `${1.3 + i * 0.06}s` }}
            />
          )
        })}

        {/* Labels */}
        {areas.map((a, i) => {
          const lp = labelPt(i)
          const label = LIFE_AREA_LABELS[a.area_key] ?? a.area_key
          const lines = splitLabel(label)
          const ta = textAnchor(i)
          const lineH = 11
          const baseY = lines.length > 1 ? lp.y - lineH / 2 : lp.y + 3
          return (
            <text
              key={i}
              textAnchor={ta}
              fontSize="9"
              fill="#6b7280"
              fontWeight="600"
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            >
              {lines.map((line, li) => (
                <tspan key={li} x={lp.x.toFixed(1)} y={(baseY + li * lineH).toFixed(1)}>
                  {line}
                </tspan>
              ))}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="life-area-legend">
        <span>
          <svg width="20" height="4" style={{ marginRight: 4, verticalAlign: 'middle' }}>
            <rect width="20" height="4" rx="2" fill="#0d9488" />
          </svg>
          Satisfação
        </span>
        <span>
          <svg width="20" height="4" style={{ marginRight: 4, verticalAlign: 'middle' }}>
            <line x1="0" y1="2" x2="20" y2="2" stroke="#f97316" strokeWidth="2" strokeDasharray="4 2" />
          </svg>
          Sofrimento
        </span>
      </div>
    </div>
  )
}

// ── Barra dupla refinada (Opção B) ───────────────────────────────────────────
function LifeAreaBar({ area, clinicalNote }: { area: PatientLifeAreaRow; clinicalNote?: string | null }) {
  const label = LIFE_AREA_LABELS[area.area_key] ?? area.area_key
  const score = area.score ?? 0
  const suffering = area.suffering ?? 0
  const pct = (score / 10) * 100
  const sufPct = (suffering / 10) * 100

  return (
    <div className="life-area-row">
      <span className="life-area-label">{label}</span>
      <div className="life-area-bars">
        <div className="life-area-bar-wrap" title={`Satisfação: ${score}/10`}>
          <div className="life-area-bar-track">
            <div className="life-area-bar satisfaction" style={{ width: `${pct}%` }} />
          </div>
          <span>{score}</span>
        </div>
        <div className="life-area-bar-wrap" title={`Sofrimento: ${suffering}/10`}>
          <div className="life-area-bar-track">
            <div className="life-area-bar suffering" style={{ width: `${sufPct}%` }} />
          </div>
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

              <AnimatedRadarChart areas={lifeAreas.data!} />

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
