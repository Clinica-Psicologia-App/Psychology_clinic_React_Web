/**
 * Ativações de esquemas marcadas pelo terapeuta nos resultados de questionários.
 * Lê questionnaire_schema_activations (somente leitura, preenchido no app).
 */
import { useQuery } from '@tanstack/react-query'
import { formatDate } from '../../lib/format'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import { listSchemaActivations } from '../../services/supabaseQueries'
import type { PatientDetailData } from '../../types'
import { BrainCircuit, RefreshCw } from 'lucide-react'

export function PatientSchemaActivationsPanel({ data }: { data: PatientDetailData }) {
  const activations = useQuery({
    queryKey: ['schema-activations', data.patient.id],
    queryFn: () => listSchemaActivations(data.patient.id),
  })

  const list = activations.data ?? []

  // Agrupa por schema_code para mostrar frequência
  const bySchema = list.reduce<Record<string, { name: string; count: number; lastNote: string | null }>>((acc, a) => {
    if (!acc[a.schema_code]) acc[a.schema_code] = { name: a.schema_name, count: 0, lastNote: null }
    acc[a.schema_code]!.count++
    if (a.psi_observation) acc[a.schema_code]!.lastNote = a.psi_observation
    return acc
  }, {})

  const sorted = Object.entries(bySchema).sort((a, b) => b[1].count - a[1].count)

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Questionários</span>
          <h2>Esquemas ativados</h2>
          <p>Esquemas de Young identificados pelo terapeuta nas respostas dos questionários.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
          <RefreshCw size={13} /> Marcado no aplicativo
        </div>
      </div>

      {!list.length && !activations.isLoading ? (
        <EmptyState
          icon={BrainCircuit}
          title="Nenhum esquema marcado ainda"
          description="Os esquemas ativados nos questionários aparecerão aqui assim que o terapeuta os marcar no aplicativo."
        />
      ) : (
        <>
          {/* Frequência de ativação por esquema */}
          <div className="schema-activations-grid">
            {sorted.map(([code, s]) => (
              <div key={code} className="schema-activation-card">
                <div className="schema-activation-header">
                  <span className="schema-name">{s.name}</span>
                  <Badge tone={s.count >= 3 ? 'danger' : s.count >= 2 ? 'warning' : 'neutral'}>
                    {s.count}× ativado{s.count !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <span className="schema-code">{code}</span>
                {s.lastNote && <p className="schema-note">{s.lastNote}</p>}
              </div>
            ))}
          </div>

          {/* Histórico detalhado */}
          <details className="schema-history-details">
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
