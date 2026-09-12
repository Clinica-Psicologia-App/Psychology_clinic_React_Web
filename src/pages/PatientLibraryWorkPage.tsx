import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Film } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { getPatientPortalLibraryWork } from '../services/supabaseQueries'

function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <section>
      <strong>{title}</strong>
      <p>{children}</p>
    </section>
  )
}

export function PatientLibraryWorkPage() {
  const { indicationId } = useParams()
  const indication = useQuery({
    queryKey: ['patient-portal-library-work', indicationId],
    queryFn: () => getPatientPortalLibraryWork(indicationId!),
    enabled: Boolean(indicationId),
  })

  const work = indication.data?.work
  const layer = work?.patient_layer ?? {}

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Minha biblioteca"
        title={work?.display_title ?? 'Obra indicada'}
        description={work?.synopsis ?? 'Orientações de leitura reflexiva indicadas pelo seu psicólogo.'}
        action={<Link to="/minha-biblioteca"><Button variant="ghost"><ArrowLeft size={16} aria-hidden="true" /> Voltar</Button></Link>}
      />

      <DataState loading={indication.isLoading} error={indication.error} onRetry={() => indication.refetch()}>
        {work ? (
          <article className="patient-library-detail panel">
            <div className="patient-library-hero">
              {work.cover_url ? <img src={work.cover_url} alt="" /> : <div className="library-work-cover"><Film size={32} aria-hidden="true" /></div>}
              <div>
                <div className="context-progress-list">
                  <Badge tone="info">{work.work_type}</Badge>
                  {work.is_animation ? <Badge tone="neutral">Animação</Badge> : null}
                  {work.intensity != null ? <Badge tone="warning">Intensidade {work.intensity}/10</Badge> : null}
                </div>
                <h2>{work.display_title}</h2>
                <p>{work.synopsis || 'Obra indicada para reflexão terapêutica.'}</p>
                {layer.where_to_watch ? <a className="btn btn-primary" href={layer.where_to_watch} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /> Onde assistir</a> : null}
              </div>
            </div>

            <div className="patient-library-sections">
              <Section title="Antes de assistir">{layer.instructions_before}</Section>
              <Section title="Durante">{layer.instructions_during}</Section>
              <Section title="Depois">{layer.instructions_after}</Section>
              {(layer.reflection_questions ?? []).length ? (
                <section>
                  <strong>Perguntas reflexivas</strong>
                  <ol>{(layer.reflection_questions ?? []).map((question) => <li key={question}>{question}</li>)}</ol>
                </section>
              ) : null}
            </div>
          </article>
        ) : (
          <EmptyState icon={Film} title="Obra não encontrada" description="Esta indicação não está disponível para seu usuário." />
        )}
      </DataState>
    </div>
  )
}
