import { useState } from 'react'
import { BrainCircuit } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import type { TimelineBeliefRow } from '../../types'

const DOMAIN_LABELS: Record<string, string> = {
  self: 'Sobre mim',
  others: 'Sobre os outros',
  world: 'Sobre o mundo',
}

const DOMAIN_TONE: Record<string, 'info' | 'warning' | 'neutral'> = {
  self: 'info',
  others: 'warning',
  world: 'neutral',
}

const YSQ_SHORT_NAMES: Record<string, string> = {
  YSQ_SCHEMA_ABANDONMENT_INSTABILITY:     'Abandono',
  YSQ_SCHEMA_MISTRUST_ABUSE:              'Desconfiança',
  YSQ_SCHEMA_EMOTIONAL_DEPRIVATION:       'Privação emocional',
  YSQ_SCHEMA_DEFECTIVENESS_SHAME:         'Defectividade',
  YSQ_SCHEMA_SOCIAL_ISOLATION:            'Isolamento social',
  YSQ_SCHEMA_DEPENDENCE_INCOMPETENCE:     'Dependência',
  YSQ_SCHEMA_VULNERABILITY:               'Vulnerabilidade',
  YSQ_SCHEMA_ENMESHMENT_UNDEVELOPED_SELF: 'Emaranhamento',
  YSQ_SCHEMA_FAILURE:                     'Fracasso',
  YSQ_SCHEMA_ENTITLEMENT_GRANDIOSITY:     'Arrogo',
  YSQ_SCHEMA_INSUFFICIENT_SELF_CONTROL:   'Autocontrole insuf.',
  YSQ_SCHEMA_SUBJUGATION:                 'Subjugação',
  YSQ_SCHEMA_SELF_SACRIFICE:              'Autossacrifício',
  YSQ_SCHEMA_APPROVAL_SEEKING:            'Busca de aprovação',
  YSQ_SCHEMA_NEGATIVISM_PESSIMISM:        'Negativismo',
  YSQ_SCHEMA_EMOTIONAL_INHIBITION:        'Inibição emocional',
  YSQ_SCHEMA_UNRELENTING_STANDARDS:       'Padrões inflexíveis',
  YSQ_SCHEMA_PUNITIVENESS:                'Postura punitiva',
}

type DomainFilter = 'all' | 'self' | 'others' | 'world'

const FILTER_TABS: { id: DomainFilter; label: string }[] = [
  { id: 'all',    label: 'Todas' },
  { id: 'self',   label: 'Sobre mim' },
  { id: 'others', label: 'Sobre os outros' },
  { id: 'world',  label: 'Sobre o mundo' },
]

export function PatientTimelineBeliefsPanel({ beliefs }: { beliefs: TimelineBeliefRow[] }) {
  const [filter, setFilter] = useState<DomainFilter>('all')

  const filtered = filter === 'all' ? beliefs : beliefs.filter((b) => b.belief_domain === filter)
  const coreCount = beliefs.filter((b) => b.is_core_belief).length

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Cognição clínica</span>
          <h2>Crenças nucleares</h2>
          <p>
            {beliefs.length
              ? `${beliefs.length} crença${beliefs.length !== 1 ? 's' : ''} · ${coreCount} nuclear${coreCount !== 1 ? 'es' : ''} identificada${coreCount !== 1 ? 's' : ''}.`
              : 'Padrões cognitivos identificados a partir dos eventos da linha do tempo.'}
          </p>
        </div>
        <BrainCircuit size={20} aria-hidden="true" />
      </div>

      {beliefs.length ? (
        <>
          <div className="belief-filter-tabs">
            {FILTER_TABS.map(({ id, label }) => {
              const count = id === 'all' ? beliefs.length : beliefs.filter((b) => b.belief_domain === id).length
              return (
                <button
                  key={id}
                  type="button"
                  className={`belief-filter-tab${filter === id ? ' active' : ''}`}
                  onClick={() => setFilter(id)}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>

          <div className="belief-list">
            {filtered.map((belief) => (
              <div className={`belief-item${belief.is_core_belief ? ' core' : ''}`} key={belief.id}>
                <div className="belief-main">
                  {belief.is_core_belief && (
                    <span className="belief-core-marker" title="Crença nuclear" aria-label="Crença nuclear" />
                  )}
                  <blockquote className="belief-text">"{belief.belief_text}"</blockquote>
                </div>
                <div className="belief-meta">
                  {belief.belief_domain && (
                    <Badge tone={DOMAIN_TONE[belief.belief_domain] ?? 'neutral'}>
                      {DOMAIN_LABELS[belief.belief_domain] ?? belief.belief_domain}
                    </Badge>
                  )}
                  {belief.schema_code && (
                    <Badge tone="danger">
                      {YSQ_SHORT_NAMES[belief.schema_code] ?? belief.schema_code}
                    </Badge>
                  )}
                  {belief.intensity != null && (
                    <span className="belief-intensity">Intensidade: {belief.intensity}/10</span>
                  )}
                </div>
                {belief.therapist_note && (
                  <p className="belief-therapist-note">{belief.therapist_note}</p>
                )}
              </div>
            ))}
            {!filtered.length && (
              <p className="chart-empty">Nenhuma crença registrada nesta categoria.</p>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          icon={BrainCircuit}
          title="Nenhuma crença registrada"
          description="As crenças nucleares serão identificadas pelo paciente à medida que aprofunda a linha do tempo no aplicativo."
        />
      )}
    </article>
  )
}
