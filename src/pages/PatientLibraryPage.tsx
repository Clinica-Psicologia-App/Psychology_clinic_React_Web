import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Film } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { listPatientPortalLibrary } from '../services/supabaseQueries'

export function PatientLibraryPage() {
  const library = useQuery({ queryKey: ['patient-portal-library'], queryFn: listPatientPortalLibrary })
  const items = library.data ?? []

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Minha biblioteca"
        description="Obras indicadas pelo seu psicólogo com orientações para reflexão."
      />

      <section className="stats-grid three">
        <StatCard label="Indicações" value={items.length} icon={Film} />
        <StatCard label="Animações" value={items.filter((item) => item.work?.is_animation).length} icon={Film} tone="blue" />
        <StatCard label="Filmes e séries" value={items.filter((item) => !item.work?.is_animation).length} icon={Film} tone="navy" />
      </section>

      <DataState loading={library.isLoading} error={library.error} onRetry={() => library.refetch()}>
        {items.length ? (
          <section className="library-work-grid">
            {items.map((indication) => {
              const work = indication.work
              if (!work) return null
              return (
                <Link className="library-work-card patient-library-link" to={`/minha-biblioteca/${indication.id}`} key={indication.id}>
                  {work.cover_url ? <img src={work.cover_url} alt="" /> : <div className="library-work-cover"><Film size={28} aria-hidden="true" /></div>}
                  <div>
                    <div className="library-work-head">
                      <span>{work.work_type}</span>
                      <Badge tone={work.is_animation ? 'info' : 'neutral'}>{work.is_animation ? 'Animação' : `${work.intensity ?? '-'} intensidade`}</Badge>
                    </div>
                    <strong>{work.display_title}</strong>
                    <p>{work.synopsis || 'Obra indicada para apoiar seu processo terapêutico.'}</p>
                    <div className="goal-meta-row">
                      {work.year ? <span>{work.year}</span> : null}
                      {(work.genres ?? []).slice(0, 3).map((genre) => <span key={`${indication.id}-${genre}`}>{genre}</span>)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </section>
        ) : (
          <EmptyState
            icon={Film}
            title="Nenhuma obra indicada ainda"
            description="Quando seu psicólogo indicar filmes, séries ou animações, eles aparecerão aqui."
          />
        )}
      </DataState>
    </div>
  )
}
