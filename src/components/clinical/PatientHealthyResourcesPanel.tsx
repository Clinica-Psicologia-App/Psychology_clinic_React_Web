import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Sprout } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import { formatDate } from '../../lib/format'
import { HEALTHY_RESOURCE_CATALOG } from '../../lib/healthyResourceCatalog'
import { getPatientHealthyResources } from '../../services/supabaseQueries'
import type { PatientDetailData } from '../../types'

export function PatientHealthyResourcesPanel({ data }: { data: PatientDetailData }) {
  const query = useQuery({
    queryKey: ['patient-healthy-resources', data.patient.id],
    queryFn: () => getPatientHealthyResources(data.patient.id),
  })

  const resources = query.data
  const selected = new Set(resources?.selected_predefined ?? [])
  const custom = resources?.custom_resources ?? []
  const groups = HEALTHY_RESOURCE_CATALOG
    .map((category) => ({ label: category.label, items: category.items.filter((item) => selected.has(item.id)) }))
    .filter((group) => group.items.length)
  const hasContent = groups.length > 0 || custom.length > 0 || Boolean(resources?.observations)

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Recursos do paciente</span>
          <h2>Recursos saudáveis</h2>
          <p>Forças e recursos pessoais registrados por você para este paciente.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
          <RefreshCw size={13} aria-hidden="true" /> Preenchido no aplicativo
        </div>
      </div>

      {query.error ? <div className="form-step-error">{(query.error as Error).message}</div> : null}

      {hasContent ? (
        <div className="conceptualization-board">
          {groups.map((group) => (
            <section className="conceptualization-section" key={group.label}>
              <h3>{group.label}</h3>
              <div className="context-progress-list">
                {group.items.map((item) => <Badge key={item.id} tone="success">{item.label}</Badge>)}
              </div>
            </section>
          ))}
          {custom.length ? (
            <section className="conceptualization-section">
              <h3>Outros recursos</h3>
              <div className="context-progress-list">
                {custom.map((item) => <Badge key={item} tone="info">{item}</Badge>)}
              </div>
            </section>
          ) : null}
          {resources?.observations ? (
            <section className="conceptualization-section">
              <h3>Observações</h3>
              <p>{resources.observations}</p>
            </section>
          ) : null}
          {resources?.updated_at ? <small style={{ color: 'var(--text-muted)' }}>Atualizado em {formatDate(resources.updated_at)}</small> : null}
        </div>
      ) : query.isLoading ? null : (
        <EmptyState
          icon={Sprout}
          title="Nenhum recurso saudável registrado"
          description="Registre os recursos do paciente no aplicativo. Eles aparecerão aqui automaticamente."
        />
      )}
    </article>
  )
}
