import { useQuery } from '@tanstack/react-query'
import { BookOpenCheck, ExternalLink } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { listPatientPortalResources } from '../services/supabaseQueries'

function resourceTypeLabel(type: string) {
  const labels: Record<string, string> = {
    material: 'Material',
    video: 'Vídeo',
    audio: 'Áudio',
    exercise: 'Exercício',
    article: 'Artigo',
    worksheet: 'Ficha prática',
  }
  return labels[type] ?? type
}

export function PatientResourcesPage() {
  const resources = useQuery({ queryKey: ['patient-portal-resources'], queryFn: listPatientPortalResources })
  const items = resources.data ?? []

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Meus recursos"
        description="Materiais e exercícios liberados pelo seu psicólogo para apoiar seu processo."
      />

      <section className="stats-grid three">
        <StatCard label="Recursos liberados" value={items.length} icon={BookOpenCheck} />
        <StatCard label="Materiais" value={items.filter((item) => item.type === 'material').length} icon={BookOpenCheck} tone="blue" />
        <StatCard label="Exercícios" value={items.filter((item) => item.type === 'exercise' || item.type === 'worksheet').length} icon={BookOpenCheck} tone="navy" />
      </section>

      <DataState loading={resources.isLoading} error={resources.error} onRetry={() => resources.refetch()}>
        {items.length ? (
          <section className="resource-catalog-grid">
            {items.map((resource) => (
              <article className="resource-card" key={resource.id}>
                <div className="resource-card-head">
                  <div>
                    <span>{resourceTypeLabel(resource.type)}</span>
                    <strong>{resource.title}</strong>
                  </div>
                  <Badge tone="success">Liberado</Badge>
                </div>
                <p>{resource.description || 'Recurso terapêutico indicado para o seu acompanhamento.'}</p>
                {resource.url ? <a className="btn btn-primary" href={resource.url} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /> Abrir recurso</a> : null}
              </article>
            ))}
          </section>
        ) : (
          <EmptyState
            icon={BookOpenCheck}
            title="Nenhum recurso liberado ainda"
            description="Quando seu psicólogo liberar materiais ou exercícios, eles aparecerão aqui."
          />
        )}
      </DataState>
    </div>
  )
}
