/**
 * Contexto familiar e padrões intergeracionais do genograma.
 * Lê patient_family_context + genogram_family_patterns do app Flutter.
 */
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, TreePine } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import { getGenogramFamilyPatterns, getPatientFamilyContext } from '../../services/supabaseQueries'
import type { PatientDetailData } from '../../types'

// Rótulos do clima familiar (chaves do Flutter)
const FAMILY_CLIMATE_LABELS: Record<string, string> = {
  warm: 'Acolhedor',
  cold: 'Frio / distante',
  conflictual: 'Conflituoso',
  chaotic: 'Caótico',
  rigid: 'Rígido',
  neglectful: 'Negligente',
  abusive: 'Abusivo',
  enmeshed: 'Emaranhado',
  supportive: 'Apoiador',
  unstable: 'Instável',
}

const PATTERN_LABELS: Record<string, string> = {
  divorce: 'Divórcio / separação',
  addiction: 'Dependência química',
  mental_illness: 'Transtorno mental',
  violence: 'Violência',
  abuse: 'Abuso (físico/sexual/emocional)',
  early_death: 'Morte precoce',
  abandonment: 'Abandono',
  migration: 'Migração / deslocamento',
  financial_loss: 'Perda financeira grave',
  secret: 'Segredos familiares',
  religious_conflict: 'Conflito religioso',
  trauma: 'Trauma geracional',
}

function TagList({ keys, labels, other }: { keys?: string[] | null; labels: Record<string, string>; other?: string | null }) {
  const items = (keys ?? []).map((k) => labels[k] ?? k)
  if (!items.length && !other) return <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-supporting)' }}>Não informado</p>
  return (
    <div className="context-progress-list">
      {items.map((label) => <Badge key={label} tone="neutral">{label}</Badge>)}
      {other && <Badge tone="neutral">Outro: {other}</Badge>}
    </div>
  )
}

export function PatientFamilyContextPanel({ data }: { data: PatientDetailData }) {
  const patientId = data.patient.id

  const familyContext = useQuery({
    queryKey: ['patient-family-context', patientId],
    queryFn: () => getPatientFamilyContext(patientId),
  })
  const familyPatterns = useQuery({
    queryKey: ['genogram-family-patterns', patientId],
    queryFn: () => getGenogramFamilyPatterns(patientId),
  })

  const hasAny = familyContext.data || familyPatterns.data

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Genograma</span>
          <h2>Contexto familiar</h2>
          <p>Clima emocional familiar e padrões intergeracionais identificados.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
          <RefreshCw size={13} /> Preenchido no aplicativo
        </div>
      </div>

      {!hasAny && !familyContext.isLoading ? (
        <EmptyState
          icon={TreePine}
          title="Contexto familiar não preenchido"
          description="Os dados aparecerão aqui assim que forem preenchidos no aplicativo."
        />
      ) : (
        <div className="family-context-grid">
          {familyContext.data && (
            <>
              <section className="family-context-section">
                <h3>Clima familiar</h3>
                <TagList
                  keys={familyContext.data.family_climate}
                  labels={FAMILY_CLIMATE_LABELS}
                  other={familyContext.data.family_climate_other}
                />
              </section>
              <section className="family-context-section">
                <h3>Padrões transgeracionais (paciente)</h3>
                <TagList
                  keys={familyContext.data.transgenerational_patterns}
                  labels={PATTERN_LABELS}
                  other={familyContext.data.transgenerational_patterns_other}
                />
              </section>
            </>
          )}

          {familyPatterns.data && (familyPatterns.data.pattern_keys ?? []).length > 0 && (
            <section className="family-context-section">
              <h3>Padrões do genograma (terapeuta)</h3>
              <TagList
                keys={familyPatterns.data.pattern_keys}
                labels={PATTERN_LABELS}
                other={familyPatterns.data.other_text}
              />
            </section>
          )}
        </div>
      )}
    </article>
  )
}
