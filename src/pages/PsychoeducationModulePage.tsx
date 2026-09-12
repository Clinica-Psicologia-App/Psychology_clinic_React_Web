import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpenCheck, CheckCircle2 } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { getPatientPsychoeducationModule, getPsychoeducationModule } from '../services/supabaseQueries'

export function PsychoeducationModulePage({ staff = false }: { staff?: boolean }) {
  const { moduleId } = useParams()
  const module = useQuery({
    queryKey: [staff ? 'psychoeducation-module' : 'patient-psychoeducation-module', moduleId],
    queryFn: () => staff ? getPsychoeducationModule(moduleId!) : getPatientPsychoeducationModule(moduleId!),
    enabled: Boolean(moduleId),
  })

  const data = module.data

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow={data ? `${data.stage} · Módulo ${data.number}` : 'Psicoeducação'}
        title={data?.title ?? 'Módulo'}
        description={data?.presentation ?? 'Conteúdo de psicoeducação em cards.'}
        action={<Link to={staff ? '/psicoeducacao' : '/minha-psicoeducacao'}><Button variant="ghost"><ArrowLeft size={16} aria-hidden="true" /> Voltar</Button></Link>}
      />

      <DataState loading={module.isLoading} error={module.error} onRetry={() => module.refetch()}>
        {data ? (
          <article className="psycho-module-detail panel" style={{ borderTopColor: data.accent_color ?? 'var(--color-brand-accent)' }}>
            {data.cover_url ? <img className="psycho-detail-cover" src={data.cover_url} alt="" /> : null}
            <div className="psycho-card-stack">
              {(data.cards ?? []).map((card, index) => (
                <section key={`${card.title ?? 'card'}-${index}`} className="psycho-learning-card">
                  <div className="library-work-head">
                    <span>Card {index + 1}</span>
                    <Badge tone="info">{card.title || 'Conteúdo'}</Badge>
                  </div>
                  {card.imageUrl ? <img src={card.imageUrl} alt="" /> : null}
                  {card.patientText ? <p>{card.patientText}</p> : null}
                  {card.reflection ? <div className="psycho-callout"><strong>Reflexão</strong><span>{card.reflection}</span></div> : null}
                  {card.exercise ? <div className="psycho-callout"><strong>Exercício</strong><span>{card.exercise}</span></div> : null}
                  {staff && card.therapistText ? <div className="psycho-callout therapist"><strong>Conteúdo profissional</strong><span>{card.therapistText}</span></div> : null}
                </section>
              ))}
              {data.closing ? <section className="psycho-learning-card"><CheckCircle2 size={22} aria-hidden="true" /><p>{data.closing}</p></section> : null}
              {!(data.cards ?? []).length ? <EmptyState icon={BookOpenCheck} title="Módulo sem cards" description="Adicione cards no editor administrativo." /> : null}
            </div>
          </article>
        ) : (
          <EmptyState icon={BookOpenCheck} title="Módulo não encontrado" description="Este conteúdo não está disponível." />
        )}
      </DataState>
    </div>
  )
}
