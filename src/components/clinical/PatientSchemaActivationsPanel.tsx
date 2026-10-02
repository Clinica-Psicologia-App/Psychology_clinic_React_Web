/**
 * Ativações de esquemas marcadas pelo terapeuta nos resultados de questionários.
 * Lê questionnaire_schema_activations (somente leitura, preenchido no app).
 * Organiza por domínios Young (YSQ) e categorias de modos (YAMI).
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDate } from '../../lib/format'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import { listSchemaActivations } from '../../services/supabaseQueries'
import type { PatientDetailData, SchemaActivationRow } from '../../types'
import { BrainCircuit, RefreshCw } from 'lucide-react'

// ── Taxonomia YSQ (espelha ysq_taxonomy.dart) ────────────────────────────────

const YSQ_DOMAINS = [
  { code: 'YSQ_DOMAIN_DISCONNECTION_REJECTION',  numeral: 'I',   name: 'Desconexão e rejeição',                      coreNeed: 'Vínculos seguros' },
  { code: 'YSQ_DOMAIN_IMPAIRED_AUTONOMY',         numeral: 'II',  name: 'Autonomia e desempenho prejudicados',         coreNeed: 'Autonomia e competência' },
  { code: 'YSQ_DOMAIN_IMPAIRED_LIMITS',           numeral: 'III', name: 'Limites prejudicados',                        coreNeed: 'Limites realistas' },
  { code: 'YSQ_DOMAIN_OTHER_DIRECTEDNESS',        numeral: 'IV',  name: 'Orientação para o outro',                     coreNeed: 'Liberdade de expressão' },
  { code: 'YSQ_DOMAIN_OVERVIGILANCE_INHIBITION',  numeral: 'V',   name: 'Hipervigilância e inibição',                  coreNeed: 'Espontaneidade e lazer' },
] as const

const YSQ_SCHEMA_DOMAIN: Record<string, string> = {
  YSQ_SCHEMA_ABANDONMENT_INSTABILITY:       'YSQ_DOMAIN_DISCONNECTION_REJECTION',
  YSQ_SCHEMA_MISTRUST_ABUSE:                'YSQ_DOMAIN_DISCONNECTION_REJECTION',
  YSQ_SCHEMA_EMOTIONAL_DEPRIVATION:         'YSQ_DOMAIN_DISCONNECTION_REJECTION',
  YSQ_SCHEMA_DEFECTIVENESS_SHAME:           'YSQ_DOMAIN_DISCONNECTION_REJECTION',
  YSQ_SCHEMA_SOCIAL_ISOLATION:              'YSQ_DOMAIN_DISCONNECTION_REJECTION',
  YSQ_SCHEMA_DEPENDENCE_INCOMPETENCE:       'YSQ_DOMAIN_IMPAIRED_AUTONOMY',
  YSQ_SCHEMA_VULNERABILITY:                 'YSQ_DOMAIN_IMPAIRED_AUTONOMY',
  YSQ_SCHEMA_ENMESHMENT_UNDEVELOPED_SELF:   'YSQ_DOMAIN_IMPAIRED_AUTONOMY',
  YSQ_SCHEMA_FAILURE:                       'YSQ_DOMAIN_IMPAIRED_AUTONOMY',
  YSQ_SCHEMA_ENTITLEMENT_GRANDIOSITY:       'YSQ_DOMAIN_IMPAIRED_LIMITS',
  YSQ_SCHEMA_INSUFFICIENT_SELF_CONTROL:     'YSQ_DOMAIN_IMPAIRED_LIMITS',
  YSQ_SCHEMA_SUBJUGATION:                   'YSQ_DOMAIN_OTHER_DIRECTEDNESS',
  YSQ_SCHEMA_SELF_SACRIFICE:                'YSQ_DOMAIN_OTHER_DIRECTEDNESS',
  YSQ_SCHEMA_APPROVAL_SEEKING:              'YSQ_DOMAIN_OTHER_DIRECTEDNESS',
  YSQ_SCHEMA_NEGATIVISM_PESSIMISM:          'YSQ_DOMAIN_OVERVIGILANCE_INHIBITION',
  YSQ_SCHEMA_EMOTIONAL_INHIBITION:          'YSQ_DOMAIN_OVERVIGILANCE_INHIBITION',
  YSQ_SCHEMA_UNRELENTING_STANDARDS:         'YSQ_DOMAIN_OVERVIGILANCE_INHIBITION',
  YSQ_SCHEMA_PUNITIVENESS:                  'YSQ_DOMAIN_OVERVIGILANCE_INHIBITION',
}

// ── Catálogo YAMI (espelha schema_mode_catalog.dart) ─────────────────────────

type YamiCategory = 'child' | 'coping' | 'parent' | 'healthyAdult'

const YAMI_CATEGORY: Record<string, YamiCategory> = {
  YAMI_MODE_02: 'child',  YAMI_MODE_04: 'child',  YAMI_MODE_08: 'child',
  YAMI_MODE_09: 'child',  YAMI_MODE_10: 'child',  YAMI_MODE_11: 'child',
  YAMI_MODE_13: 'child',  YAMI_MODE_18: 'child',  YAMI_MODE_19: 'child',
  YAMI_MODE_01: 'coping', YAMI_MODE_06: 'coping', YAMI_MODE_07: 'coping',
  YAMI_MODE_14: 'coping', YAMI_MODE_15: 'coping', YAMI_MODE_16: 'coping', YAMI_MODE_17: 'coping',
  YAMI_MODE_03: 'parent', YAMI_MODE_05: 'parent',
  YAMI_MODE_12: 'healthyAdult',
}

const YAMI_CATEGORY_META: Record<YamiCategory, { label: string; tone: 'info' | 'warning' | 'danger' | 'success' }> = {
  child:        { label: 'Modos Criança',                 tone: 'info' },
  coping:       { label: 'Modos de Enfrentamento',        tone: 'warning' },
  parent:       { label: 'Modos Parentais Disfuncionais', tone: 'danger' },
  healthyAdult: { label: 'Adulto Saudável',               tone: 'success' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type SchemaEntry = { name: string; count: number; lastNote: string | null }

function groupByCode(list: SchemaActivationRow[]): Record<string, SchemaEntry> {
  return list.reduce<Record<string, SchemaEntry>>((acc, a) => {
    if (!acc[a.schema_code]) acc[a.schema_code] = { name: a.schema_name, count: 0, lastNote: null }
    acc[a.schema_code]!.count++
    if (a.psi_observation) acc[a.schema_code]!.lastNote = a.psi_observation
    return acc
  }, {})
}

function countTone(count: number): 'danger' | 'warning' | 'neutral' {
  return count >= 3 ? 'danger' : count >= 2 ? 'warning' : 'neutral'
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function DomainSummaryRow({ domainActivations }: {
  domainActivations: Map<string, { totalCount: number; uniqueSchemas: number }>
}) {
  const maxCount = Math.max(1, ...Array.from(domainActivations.values()).map((d) => d.totalCount))

  return (
    <div className="ysq-domain-row">
      {YSQ_DOMAINS.map((d) => {
        const stats = domainActivations.get(d.code)
        const active = (stats?.totalCount ?? 0) > 0
        const pct = active ? Math.round(((stats?.totalCount ?? 0) / maxCount) * 100) : 0
        return (
          <div key={d.code} className={`ysq-domain-card${active ? ' active' : ''}`}>
            <span className="ysq-domain-numeral">{d.numeral}</span>
            <span className="ysq-domain-name">{d.name}</span>
            {active ? (
              <>
                <div className="ysq-domain-bar-bg">
                  <div className="ysq-domain-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="ysq-domain-stat">{stats!.uniqueSchemas} esquema{stats!.uniqueSchemas !== 1 ? 's' : ''} · {stats!.totalCount}× ativado{stats!.totalCount !== 1 ? 's' : ''}</span>
              </>
            ) : (
              <span className="ysq-domain-stat muted">Sem ativações</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DominantDomainCallout({ domainActivations }: {
  domainActivations: Map<string, { totalCount: number; uniqueSchemas: number }>
}) {
  let maxCode = ''
  let maxCount = 0
  domainActivations.forEach((stats, code) => {
    if (stats.totalCount > maxCount) { maxCount = stats.totalCount; maxCode = code }
  })
  if (!maxCode) return null

  const domain = YSQ_DOMAINS.find((d) => d.code === maxCode)
  if (!domain) return null

  return (
    <div className="ysq-callout">
      <span className="ysq-callout-label">Domínio mais ativado</span>
      <strong>Domínio {domain.numeral} — {domain.name}</strong>
      <span>Necessidade central não atendida: <em>{domain.coreNeed}</em></span>
    </div>
  )
}

function YamiPanel({ byCode }: { byCode: Record<string, SchemaEntry> }) {
  const yamiEntries = Object.entries(byCode).filter(([code]) => code.startsWith('YAMI_MODE_'))
  if (!yamiEntries.length) return null

  const byCategory: Partial<Record<YamiCategory, Array<[string, SchemaEntry]>>> = {}
  for (const entry of yamiEntries) {
    const cat = YAMI_CATEGORY[entry[0]] ?? 'coping'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat]!.push(entry)
  }

  const order: YamiCategory[] = ['child', 'coping', 'parent', 'healthyAdult']

  return (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <h3 style={{ fontSize: 'var(--text-supporting)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 var(--space-3)' }}>
        Modos Esquemáticos (YAMI)
      </h3>
      <div className="schema-activations-grid">
        {order.flatMap((cat) =>
          (byCategory[cat] ?? []).map(([code, s]) => {
            const meta = YAMI_CATEGORY_META[cat]
            return (
              <div key={code} className="schema-activation-card">
                <div className="schema-activation-header">
                  <span className="schema-name">{s.name}</span>
                  <Badge tone={countTone(s.count)}>{s.count}× ativado{s.count !== 1 ? 's' : ''}</Badge>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
                {s.lastNote && <p className="schema-note">{s.lastNote}</p>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PatientSchemaActivationsPanel({ data }: { data: PatientDetailData }) {
  const activations = useQuery({
    queryKey: ['schema-activations', data.patient.id],
    queryFn: () => listSchemaActivations(data.patient.id),
  })

  const list = activations.data ?? []
  const byCode = useMemo(() => groupByCode(list), [list])

  // Domínio → contagens agregadas (apenas YSQ, não YAMI)
  const domainActivations = useMemo(() => {
    const map = new Map<string, { totalCount: number; uniqueSchemas: number }>()
    for (const [code, entry] of Object.entries(byCode)) {
      if (!code.startsWith('YSQ_SCHEMA_')) continue
      const domCode = YSQ_SCHEMA_DOMAIN[code]
      if (!domCode) continue
      const cur = map.get(domCode) ?? { totalCount: 0, uniqueSchemas: 0 }
      map.set(domCode, { totalCount: cur.totalCount + entry.count, uniqueSchemas: cur.uniqueSchemas + 1 })
    }
    return map
  }, [byCode])

  const ysqEntries = useMemo(
    () => Object.entries(byCode).filter(([code]) => code.startsWith('YSQ_SCHEMA_')).sort((a, b) => b[1].count - a[1].count),
    [byCode]
  )

  const hasAnyActivation = list.length > 0

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Questionários</span>
          <h2>Esquemas e modos ativados</h2>
          <p>Esquemas de Young e modos YAMI identificados pelo terapeuta nas respostas dos questionários.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
          <RefreshCw size={13} /> Marcado no aplicativo
        </div>
      </div>

      {!hasAnyActivation && !activations.isLoading ? (
        <EmptyState
          icon={BrainCircuit}
          title="Nenhum esquema marcado ainda"
          description="Os esquemas ativados nos questionários aparecerão aqui assim que o terapeuta os marcar no aplicativo."
        />
      ) : (
        <>
          {/* Perfil de domínios Young */}
          {ysqEntries.length > 0 && (
            <section style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-supporting)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 var(--space-3)' }}>
                Perfil de domínios Young
              </h3>
              <DomainSummaryRow domainActivations={domainActivations} />
              <DominantDomainCallout domainActivations={domainActivations} />
            </section>
          )}

          {/* Esquemas YSQ agrupados por domínio */}
          {ysqEntries.length > 0 && (
            <section style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-supporting)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 var(--space-3)' }}>
                Esquemas de Young (YSQ)
              </h3>
              {YSQ_DOMAINS.map((domain) => {
                const schemasInDomain = ysqEntries.filter(([code]) => YSQ_SCHEMA_DOMAIN[code] === domain.code)
                if (!schemasInDomain.length) return null
                return (
                  <div key={domain.code} style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-caption)', background: 'var(--color-brand-teal)', color: '#fff', borderRadius: 4, padding: '1px 7px' }}>
                        {domain.numeral}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-supporting)' }}>{domain.name}</span>
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>· Necessidade: {domain.coreNeed}</span>
                    </div>
                    <div className="schema-activations-grid">
                      {schemasInDomain.map(([code, s]) => (
                        <div key={code} className="schema-activation-card">
                          <div className="schema-activation-header">
                            <span className="schema-name">{s.name}</span>
                            <Badge tone={countTone(s.count)}>{s.count}× ativado{s.count !== 1 ? 's' : ''}</Badge>
                          </div>
                          <span className="schema-code">{code}</span>
                          {s.lastNote && <p className="schema-note">{s.lastNote}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {/* Modos YAMI */}
          <YamiPanel byCode={byCode} />

          {/* Histórico detalhado */}
          <details className="schema-history-details" style={{ marginTop: 'var(--space-4)' }}>
            <summary>Ver histórico completo ({list.length} marcações)</summary>
            <div className="table-card compact-table report-table" style={{ marginTop: 'var(--space-3)' }}>
              <table>
                <thead><tr><th>Esquema</th><th>Código</th><th>Observação</th><th>Data</th></tr></thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td>{a.schema_name}</td>
                      <td><Badge tone="neutral">{a.schema_code}</Badge></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{a.psi_observation ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{a.created_at ? formatDate(a.created_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </article>
  )
}
