import { useQuery } from '@tanstack/react-query'
import { Activity, BrainCircuit, Heart, Layers, RefreshCw, Stethoscope, TreePine, Users } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import { getCaseConceptualization } from '../../services/supabaseQueries'
import type {
  CaseDiagnosis,
  CaseOrigins,
  GeneralImpressions,
  ModeSequence,
  PatientDetailData,
  TherapeuticRelationship,
  UnmetNeed,
} from '../../types'

// ── 9 necessidades essenciais (mesma ordem do app Flutter) ───────────────────
const CORE_NEEDS: Record<string, string> = {
  conexao: 'Conexão (afeto, aceitação, amor)',
  expressao: 'Expressão de emoções e necessidades',
  seguranca: 'Segurança e previsibilidade',
  limites: 'Limites realistas e autocontrole',
  espontaneidade: 'Espontaneidade e brincadeira',
  competencia: 'Afirmação de competência (autonomia)',
  autonomia_respeito: 'Respeito à autonomia',
  valor: 'Valor intrínseco',
  modelo: 'Modelo saudável (cuidador competente)',
}

function ratingLabel(r?: string | null) {
  if (!r) return null
  if (r === 'X') return 'Info insuficiente'
  const n = parseInt(r, 10)
  if (isNaN(n)) return r
  const labels = ['Não afetada', 'Muito leve', 'Leve', 'Moderada', 'Intensa', 'Muito intensa']
  return `${r} — ${labels[n] ?? ''}`
}

function ratingTone(r?: string | null): 'neutral' | 'info' | 'warning' | 'error' {
  if (!r || r === 'X') return 'neutral'
  const n = parseInt(r, 10)
  if (n <= 1) return 'info'
  if (n <= 3) return 'warning'
  return 'error'
}

function StarRating({ value, max = 5 }: { value?: number | null; max?: number }) {
  if (!value) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  return (
    <span className="star-rating">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < value ? 'var(--warning)' : 'var(--border-subtle)' }}>★</span>
      ))}
      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginLeft: 4 }}>{value}/{max}</span>
    </span>
  )
}

// ── Seções de visualização ────────────────────────────────────────────────────

function NeedsSection({ needs }: { needs?: UnmetNeed[] | null }) {
  const active = (needs ?? []).filter((n) => n.rating && n.rating !== '0')
  if (!active.length) return null
  return (
    <section className="conceptualization-section">
      <h3><Heart size={16} /> Necessidades não atendidas</h3>
      <div className="needs-grid">
        {active.map((n) => (
          <div key={n.need_key} className="need-card">
            <div className="need-header">
              <span className="need-label">{CORE_NEEDS[n.need_key] ?? n.need_key}</span>
              <Badge tone={ratingTone(n.rating)}>{ratingLabel(n.rating)}</Badge>
            </div>
            {n.schemas && <p className="need-detail"><strong>Esquemas:</strong> {n.schemas}</p>}
            {n.origin && <p className="need-detail"><strong>Origem:</strong> {n.origin}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

function ModesSection({ sequences }: { sequences?: ModeSequence[] | null }) {
  const active = (sequences ?? []).filter((s) =>
    s.trigger || s.activated_modes || s.coping_mode || s.sequence || s.effect,
  )
  if (!active.length) return null
  return (
    <section className="conceptualization-section">
      <h3><Layers size={16} /> Sequências de modos</h3>
      <div className="mode-sequences">
        {active.map((s, i) => (
          <div key={i} className="mode-sequence-card">
            {s.trigger && (
              <div className="mode-step">
                <span className="mode-step-label">Gatilho</span>
                <span>{s.trigger}</span>
              </div>
            )}
            {s.activated_modes && (
              <div className="mode-step">
                <span className="mode-step-label">Modos ativados</span>
                <span>{s.activated_modes}</span>
              </div>
            )}
            {s.coping_mode && (
              <div className="mode-step">
                <span className="mode-step-label">Modo de coping</span>
                <span>{s.coping_mode}</span>
              </div>
            )}
            {s.sequence && (
              <div className="mode-step">
                <span className="mode-step-label">Sequência</span>
                <span>{s.sequence}</span>
              </div>
            )}
            {s.effect && (
              <div className="mode-step">
                <span className="mode-step-label">Efeito</span>
                <span>{s.effect}</span>
              </div>
            )}
            {s.perpetuation && (
              <div className="mode-step">
                <span className="mode-step-label">Perpetuação</span>
                <span>{s.perpetuation}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function RelationshipSection({ rel }: { rel?: TherapeuticRelationship | null }) {
  if (!rel || (!rel.collaboration_rating && !rel.bond_rating && !rel.therapist_reactions)) return null
  return (
    <section className="conceptualization-section">
      <h3><Users size={16} /> Relação terapêutica</h3>
      <div className="relationship-grid">
        {rel.collaboration_rating != null && (
          <div className="rel-item">
            <span className="rel-label">Colaboração</span>
            <StarRating value={rel.collaboration_rating} />
            {rel.collaboration_notes && <p>{rel.collaboration_notes}</p>}
          </div>
        )}
        {rel.bond_rating != null && (
          <div className="rel-item">
            <span className="rel-label">Vínculo</span>
            <StarRating value={rel.bond_rating} />
            {rel.bond_notes && <p>{rel.bond_notes}</p>}
          </div>
        )}
        {rel.therapist_reactions && (
          <div className="rel-item span-two">
            <span className="rel-label">Reações do terapeuta</span>
            <p>{rel.therapist_reactions}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function ImpressionsSection({ impressions }: { impressions?: GeneralImpressions | null }) {
  if (!impressions || (!impressions.initial && !impressions.current)) return null
  return (
    <section className="conceptualization-section">
      <h3><Activity size={16} /> Impressões gerais</h3>
      <div className="impressions-grid">
        {impressions.initial && (
          <div className="impression-card">
            <span className="impression-label">Apresentação inicial</span>
            <p>{impressions.initial}</p>
          </div>
        )}
        {impressions.current && (
          <div className="impression-card">
            <span className="impression-label">Apresentação atual</span>
            <p>{impressions.current}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function DiagnosisSection({ diagnosis }: { diagnosis?: CaseDiagnosis | null }) {
  if (!diagnosis || (!diagnosis.system && !diagnosis.items?.length)) return null
  return (
    <section className="conceptualization-section">
      <h3><Stethoscope size={16} /> Diagnóstico</h3>
      {diagnosis.system && <p className="diagnosis-system">{diagnosis.system}</p>}
      {(diagnosis.items ?? []).filter((d) => d.name).map((d, i) => (
        <div key={i} className="diagnosis-item">
          <span>{d.name}</span>
          {d.code && <Badge tone="neutral">{d.code}</Badge>}
        </div>
      ))}
    </section>
  )
}

function OriginsSection({ origins }: { origins?: CaseOrigins | null }) {
  if (!origins || (!origins.early_history && !origins.temperament && !origins.cultural)) return null
  return (
    <section className="conceptualization-section">
      <h3><TreePine size={16} /> Origens</h3>
      {origins.early_history && (
        <div className="origin-block">
          <span className="origin-label">História inicial</span>
          <p>{origins.early_history}</p>
        </div>
      )}
      {origins.temperament && (
        <div className="origin-block">
          <span className="origin-label">Fatores temperamentais / biológicos</span>
          <p>{origins.temperament}</p>
        </div>
      )}
      {origins.cultural && (
        <div className="origin-block">
          <span className="origin-label">Fatores culturais, étnicos e religiosos</span>
          <p>{origins.cultural}</p>
        </div>
      )}
    </section>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function PatientCaseConceptualizationManager({ data }: { data: PatientDetailData }) {
  const conceptualization = useQuery({
    queryKey: ['case-conceptualization', data.patient.id],
    queryFn: () => getCaseConceptualization(data.patient.id),
  })

  const cc = conceptualization.data
  const hasContent = cc && (
    (cc.unmet_needs ?? []).some((n) => n.rating && n.rating !== '0') ||
    (cc.mode_sequences ?? []).some((s) => s.trigger || s.activated_modes) ||
    cc.therapeutic_relationship?.collaboration_rating != null ||
    cc.general_impressions?.initial ||
    cc.diagnosis?.items?.length ||
    cc.origins?.early_history ||
    cc.motivo_notes ||
    cc.additional_comments
  )

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Módulos avançados</span>
          <h2>Conceitualização de caso</h2>
          <p>Formulação em Terapia de Esquemas: necessidades, modos, origens, diagnóstico e aliança terapêutica.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
          <RefreshCw size={13} />
          Preenchido no aplicativo
        </div>
      </div>

      {conceptualization.error ? (
        <div className="form-step-error">{(conceptualization.error as Error).message}</div>
      ) : null}

      {hasContent && cc ? (
        <div className="conceptualization-board">
          {(cc.motivo_notes || cc.additional_comments) && (
            <section className="conceptualization-section conceptualization-core">
              <BrainCircuit size={20} aria-hidden="true" />
              {cc.motivo_notes && (
                <>
                  <strong>Motivo / queixa (terapeuta)</strong>
                  <p>{cc.motivo_notes}</p>
                </>
              )}
              {cc.additional_comments && (
                <>
                  <strong style={{ marginTop: cc.motivo_notes ? 'var(--space-3)' : undefined }}>Comentários adicionais</strong>
                  <p>{cc.additional_comments}</p>
                </>
              )}
            </section>
          )}

          <ImpressionsSection impressions={cc.general_impressions} />
          <DiagnosisSection diagnosis={cc.diagnosis} />
          <NeedsSection needs={cc.unmet_needs} />
          <ModesSection sequences={cc.mode_sequences} />
          <OriginsSection origins={cc.origins} />
          <RelationshipSection rel={cc.therapeutic_relationship} />
        </div>
      ) : conceptualization.isLoading ? null : (
        <EmptyState
          icon={BrainCircuit}
          title="Conceitualização ainda vazia"
          description="Preencha a conceitualização de caso no aplicativo. Os dados aparecerão aqui automaticamente."
        />
      )}
    </article>
  )
}
