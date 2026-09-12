import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpenCheck } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { listPatientPsychoeducationModules, listPsychoeducationModules } from '../services/supabaseQueries'

const stages = ['Conhecer', 'Compreender', 'Transformar']

export function PsychoeducationJourneyPage({ staff = false }: { staff?: boolean }) {
  const modules = useQuery({
    queryKey: [staff ? 'psychoeducation-modules' : 'patient-psychoeducation-modules'],
    queryFn: staff ? listPsychoeducationModules : listPatientPsychoeducationModules,
  })

  const items = modules.data ?? []

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow={staff ? 'Conteúdo profissional' : 'Área do paciente'}
        title="Jornada de psicoeducação"
        description={staff ? 'Visão com conteúdo profissional dos módulos.' : 'Conhecer, compreender e transformar em módulos guiados.'}
      />

      <section className="stats-grid three">
        <StatCard label="Módulos" value={items.length} icon={BookOpenCheck} />
        <StatCard label="Etapas" value={stages.length} icon={BookOpenCheck} tone="blue" />
        <StatCard label="Cards" value={items.reduce((sum, module) => sum + (module.cards?.length ?? 0), 0)} icon={BookOpenCheck} tone="navy" />
      </section>

      <DataState loading={modules.isLoading} error={modules.error} onRetry={() => modules.refetch()}>
        {items.length ? (
          <div className="psycho-journey">
            {stages.map((stage) => {
              const stageModules = items.filter((module) => module.stage === stage)
              return (
                <section key={stage}>
                  <div className="panel-header">
                    <div><span className="eyebrow">Etapa</span><h2>{stage}</h2></div>
                    <Badge tone="info">{stageModules.length} módulos</Badge>
                  </div>
                  <div className="psycho-module-grid">
                    {stageModules.map((module) => (
                      <Link className="psycho-module-card patient-library-link" to={staff ? `/psicoeducacao/${module.id}` : `/minha-psicoeducacao/${module.id}`} key={module.id} style={{ borderTopColor: module.accent_color ?? 'var(--color-brand-accent)' }}>
                        {module.cover_url ? <img src={module.cover_url} alt="" /> : <div className="psycho-module-cover" style={{ background: module.accent_color ?? undefined }}><BookOpenCheck size={26} aria-hidden="true" /></div>}
                        <div>
                          <div className="library-work-head">
                            <span>Módulo {module.number}</span>
                            <Badge tone="neutral">{module.cards?.length ?? 0} cards</Badge>
                          </div>
                          <strong>{module.title}</strong>
                          <p>{module.presentation || 'Módulo de psicoeducação.'}</p>
                        </div>
                      </Link>
                    ))}
                    {!stageModules.length ? <EmptyState icon={BookOpenCheck} title={`Sem módulos em ${stage}`} description="Cadastre módulos no catálogo administrativo." /> : null}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <EmptyState icon={BookOpenCheck} title="Jornada ainda vazia" description="Os módulos de psicoeducação aparecerão aqui quando forem cadastrados." />
        )}
      </DataState>
    </div>
  )
}
