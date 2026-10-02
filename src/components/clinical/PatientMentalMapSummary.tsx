/**
 * Mapa clínico agregado.
 * Quadrante padrão + MentalMapClinicalCore (top schemas YSQ / modos YAMI)
 * espelhando mental_map_clinical_core.dart do Flutter.
 */
import { BrainCircuit, CalendarClock, HeartPulse, Layers, Target } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import type { PatientDetailData, PatientQuestionnaireResultRow, PatientTimelineEventRow } from '../../types'

// ── Mapeamento de domínios YSQ (espelha ysq_taxonomy.dart) ───────────────────

const YSQ_SCHEMA_DOMAIN: Record<string, string> = {
  YSQ_SCHEMA_ABANDONMENT_INSTABILITY:     'I',
  YSQ_SCHEMA_MISTRUST_ABUSE:              'I',
  YSQ_SCHEMA_EMOTIONAL_DEPRIVATION:       'I',
  YSQ_SCHEMA_DEFECTIVENESS_SHAME:         'I',
  YSQ_SCHEMA_SOCIAL_ISOLATION:            'I',
  YSQ_SCHEMA_DEPENDENCE_INCOMPETENCE:     'II',
  YSQ_SCHEMA_VULNERABILITY:               'II',
  YSQ_SCHEMA_ENMESHMENT_UNDEVELOPED_SELF: 'II',
  YSQ_SCHEMA_FAILURE:                     'II',
  YSQ_SCHEMA_ENTITLEMENT_GRANDIOSITY:     'III',
  YSQ_SCHEMA_INSUFFICIENT_SELF_CONTROL:   'III',
  YSQ_SCHEMA_SUBJUGATION:                 'IV',
  YSQ_SCHEMA_SELF_SACRIFICE:              'IV',
  YSQ_SCHEMA_APPROVAL_SEEKING:            'IV',
  YSQ_SCHEMA_NEGATIVISM_PESSIMISM:        'V',
  YSQ_SCHEMA_EMOTIONAL_INHIBITION:        'V',
  YSQ_SCHEMA_UNRELENTING_STANDARDS:       'V',
  YSQ_SCHEMA_PUNITIVENESS:               'V',
}

const DOMAIN_NAMES: Record<string, string> = {
  'I':   'Desconexão e rejeição',
  'II':  'Autonomia prejudicada',
  'III': 'Limites prejudicados',
  'IV':  'Orientação para o outro',
  'V':   'Hipervigilância e inibição',
}

const YAMI_CATEGORY: Record<string, { label: string; tone: 'info' | 'warning' | 'danger' | 'success' }> = {
  YAMI_MODE_02: { label: 'Criança', tone: 'info' },
  YAMI_MODE_04: { label: 'Criança', tone: 'info' },
  YAMI_MODE_08: { label: 'Criança', tone: 'info' },
  YAMI_MODE_09: { label: 'Criança', tone: 'info' },
  YAMI_MODE_10: { label: 'Criança', tone: 'info' },
  YAMI_MODE_11: { label: 'Criança', tone: 'info' },
  YAMI_MODE_13: { label: 'Criança', tone: 'info' },
  YAMI_MODE_18: { label: 'Criança', tone: 'info' },
  YAMI_MODE_19: { label: 'Criança', tone: 'info' },
  YAMI_MODE_01: { label: 'Enfrentamento', tone: 'warning' },
  YAMI_MODE_06: { label: 'Enfrentamento', tone: 'warning' },
  YAMI_MODE_07: { label: 'Enfrentamento', tone: 'warning' },
  YAMI_MODE_14: { label: 'Enfrentamento', tone: 'warning' },
  YAMI_MODE_15: { label: 'Enfrentamento', tone: 'warning' },
  YAMI_MODE_16: { label: 'Enfrentamento', tone: 'warning' },
  YAMI_MODE_17: { label: 'Enfrentamento', tone: 'warning' },
  YAMI_MODE_03: { label: 'Parental', tone: 'danger' },
  YAMI_MODE_05: { label: 'Parental', tone: 'danger' },
  YAMI_MODE_12: { label: 'Adulto Saudável', tone: 'success' },
}

const YSQ_ACTIVATION_THRESHOLD = 4.0

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(score: number): string {
  if (score >= YSQ_ACTIVATION_THRESHOLD) return '#E24B4A'
  if (score >= 3) return '#F59E0B'
  return '#0F9C90'
}

function latest<T>(items: T[], fallback: string, read: (item: T) => string | null | undefined) {
  const item = items[0]
  return item ? read(item) || fallback : fallback
}

function topByScore(results: PatientQuestionnaireResultRow[], prefix: string, limit: number) {
  return results
    .filter((r) => r.category_code?.startsWith(prefix))
    .map((r) => ({ ...r, _score: r.professional_average_score ?? r.average_score ?? 0 }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
}

// ── TDE pattern labels (espelha PatientTimelineManager — chaves reais do banco) ─

const EMOTIONAL_NEED_LABELS: Record<string, string> = {
  presence:      'Presença / companhia',
  safety:        'Segurança',
  affection:     'Afeto e carinho',
  understanding: 'Ser ouvido(a)',
  acceptance:    'Aceitação',
  expression:    'Expressão emocional',
  autonomy:      'Autonomia',
  encouragement: 'Incentivo e confiança',
  limits:        'Limites e orientação',
  play:          'Espontaneidade / lazer',
  dont_know:     'Não identificado',
  other:         'Outra necessidade',
}

const COPING_LABELS: Record<string, string> = {
  avoidance:                'Evitação',
  surrender_adaptation:     'Adaptação / capitulação',
  overcompensation_reaction: 'Reação / supercompensação',
  emotional_shutdown:       'Desligamento emocional',
  help_protection:          'Busca de ajuda / proteção',
  perfectionism:            'Perfeccionismo',
  other:                    'Outro coping',
}

const PRESENT_AREA_LABELS: Record<string, string> = {
  self_view:     'Como me vejo',
  relationships: 'Relacionamentos',
  family:        'Família',
  emotions:      'Emoções',
  work:          'Trabalho / estudos',
  choices:       'Minhas escolhas',
  coping:        'Como lido com dificuldades',
  other:         'Outra área',
}

function topKeys(events: PatientTimelineEventRow[], getKeys: (e: PatientTimelineEventRow) => string[] | null | undefined, limit = 3) {
  const counts: Record<string, number> = {}
  for (const event of events) {
    for (const key of getKeys(event) ?? []) {
      counts[key] = (counts[key] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

function TdePatterns({ events }: { events: PatientTimelineEventRow[] }) {
  const eventsWithTde = events.filter((e) =>
    (e.emotional_need_keys?.length ?? 0) > 0 ||
    (e.coping_keys?.length ?? 0) > 0 ||
    (e.present_area_keys?.length ?? 0) > 0,
  )
  if (eventsWithTde.length < 2) return null

  const topNeeds = topKeys(events, (e) => e.emotional_need_keys)
  const topCoping = topKeys(events, (e) => e.coping_keys)
  const topAreas = topKeys(events, (e) => e.present_area_keys)

  if (!topNeeds.length && !topCoping.length && !topAreas.length) return null

  return (
    <div className="clinical-core-section">
      <span className="clinical-core-section-title">
        <Layers size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
        Padrões da linha de vida
        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: 8 }}>
          ({eventsWithTde.length} eventos com aprofundamento)
        </span>
      </span>
      <div className="clinical-core-grid">
        {topNeeds.length > 0 && (
          <div className="clinical-core-block">
            <span className="clinical-core-label">Necessidades frequentes</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {topNeeds.map(([key, count]) => (
                <div key={key} className="clinical-core-mode-row">
                  <span className="clinical-core-score-name">{EMOTIONAL_NEED_LABELS[key] ?? key}</span>
                  <Badge tone="info">{count}×</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        {topCoping.length > 0 && (
          <div className="clinical-core-block">
            <span className="clinical-core-label">Estratégias de coping</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {topCoping.map(([key, count]) => (
                <div key={key} className="clinical-core-mode-row">
                  <span className="clinical-core-score-name">{COPING_LABELS[key] ?? key}</span>
                  <Badge tone="warning">{count}×</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        {topAreas.length > 0 && (
          <div className="clinical-core-block">
            <span className="clinical-core-label">Áreas de vida afetadas</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {topAreas.map(([key, count]) => (
                <div key={key} className="clinical-core-mode-row">
                  <span className="clinical-core-score-name">{PRESENT_AREA_LABELS[key] ?? key}</span>
                  <Badge tone="neutral">{count}×</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Clinical Core sub-components ──────────────────────────────────────────────

function SchemaHighlights({ results }: { results: PatientQuestionnaireResultRow[] }) {
  const top = topByScore(results, 'YSQ_SCHEMA_', 5)
  if (!top.length) return null

  const maxScore = Math.max(...top.map((r) => r._score), 1)

  // Dominant domain
  const domainCounts: Record<string, number> = {}
  for (const r of results.filter((x) => x.category_code?.startsWith('YSQ_SCHEMA_'))) {
    const numeral = YSQ_SCHEMA_DOMAIN[r.category_code ?? '']
    if (numeral) domainCounts[numeral] = (domainCounts[numeral] ?? 0) + (r._score ?? 0)
  }
  const dominantDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  return (
    <div className="clinical-core-block">
      <div className="clinical-core-block-header">
        <span className="clinical-core-label">Esquemas YSQ</span>
        {dominantDomain && (
          <span className="clinical-core-domain">
            Dom. {dominantDomain} · {DOMAIN_NAMES[dominantDomain]}
          </span>
        )}
      </div>
      <div className="clinical-core-scores">
        {top.map((r) => (
          <div key={r.id} className="clinical-core-score-row">
            <span className="clinical-core-score-name">{r.category_name ?? r.category_code}</span>
            <div className="clinical-core-score-bar-bg">
              <div
                className="clinical-core-score-bar-fill"
                style={{
                  width: `${(r._score / maxScore) * 100}%`,
                  background: severityColor(r._score),
                }}
              />
            </div>
            <span className="clinical-core-score-value" style={{ color: severityColor(r._score) }}>
              {r._score.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModeHighlights({ results }: { results: PatientQuestionnaireResultRow[] }) {
  const top = topByScore(results, 'YAMI_MODE_', 4)
  if (!top.length) return null

  return (
    <div className="clinical-core-block">
      <span className="clinical-core-label">Modos YAMI</span>
      <div className="clinical-core-modes">
        {top.map((r) => {
          const cat = YAMI_CATEGORY[r.category_code ?? ''] ?? { label: 'Modo', tone: 'neutral' as const }
          return (
            <div key={r.id} className="clinical-core-mode-row">
              <span className="clinical-core-score-name">{r.category_name ?? r.category_code}</span>
              <Badge tone={cat.tone}>{cat.label}</Badge>
              <span className="clinical-core-score-value">{r._score.toFixed(1)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

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

  const activeProblems = data.problems
    .filter((p) => p.status === 'active')
    .sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0))
  const activeGoals = data.goals.filter((g) => g.status === 'active')

  const hasSchemaData = data.responseResults.some((r) => r.category_code?.startsWith('YSQ_SCHEMA_') || r.category_code?.startsWith('YAMI_MODE_'))

  return (
    <article className="panel report-table-panel mental-map-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Mapa mental</span>
          <h2>Mapa clínico agregado</h2>
          <p>Síntese alimentada por avaliação inicial, problemas, metas, timeline, monitoramento e questionários.</p>
        </div>
        <BrainCircuit size={20} aria-hidden="true" />
      </div>

      {/* Quadrante 2×2 */}
      <div className="mental-map-grid">
        <section className="mental-map-core">
          <BrainCircuit size={24} aria-hidden="true" />
          <strong>{data.patient.full_name}</strong>
          <span>{data.patient.therapy_demands || data.patient.intake_summary || 'Caso em construção'}</span>
        </section>

        <section>
          <div><Target size={18} aria-hidden="true" /><strong>Plano terapêutico</strong></div>
          <p>{activeProblems.length} problema(s) ativo(s) · {activeGoals.length} meta(s) ativa(s)</p>
          <div className="context-progress-list">
            {activeProblems.slice(0, 3).map((p) => (
              <Badge key={p.id} tone={p.intensity != null && p.intensity >= 7 ? 'danger' : 'warning'}>
                {p.title}{p.intensity != null ? ` (${p.intensity})` : ''}
              </Badge>
            ))}
            {activeGoals.slice(0, 3).map((g) => <Badge key={g.id} tone="info">{g.title}</Badge>)}
          </div>
        </section>

        <section>
          <div><CalendarClock size={18} aria-hidden="true" /><strong>História e contexto</strong></div>
          <p>{latest(data.timelineEvents, data.patient.current_life_context || 'Sem evento principal registrado.', (e) => e.title)}</p>
          <span>{data.timelineEvents.length} evento(s) estruturado(s)</span>
        </section>

        <section>
          <div><HeartPulse size={18} aria-hidden="true" /><strong>Monitoramento recente</strong></div>
          <p>{latest(data.checkIns, 'Sem check-in recente.', (c) => c.notes || `Humor ${c.mood_score ?? '-'}/10 · ansiedade ${c.anxiety_score ?? '-'}/10`)}</p>
          <span>{data.checkIns.length + data.dailyMonitors.length} registro(s) de acompanhamento</span>
        </section>
      </div>

      {/* Padrões TDE da linha de vida */}
      <TdePatterns events={data.timelineEvents} />

      {/* Perfil clínico — apenas quando há dados de questionários */}
      {hasSchemaData && (
        <div className="clinical-core-section">
          <span className="clinical-core-section-title">Perfil de personalidade clínica</span>
          <div className="clinical-core-grid">
            <SchemaHighlights results={data.responseResults} />
            <ModeHighlights results={data.responseResults} />
          </div>
        </div>
      )}
    </article>
  )
}
