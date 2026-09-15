import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Film } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { FilterBar, FilterSelect, SearchField } from '../components/design-system/FilterBar'
import { listLibraryWorks } from '../services/supabaseQueries'

export function StaffLibraryCatalogPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const library = useQuery({ queryKey: ['staff-library-catalog'], queryFn: listLibraryWorks })
  const works = library.data ?? []

  const filtered = useMemo(() => {
    return works.filter((work) => {
      if (typeFilter !== 'all' && work.work_type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          work.display_title.toLowerCase().includes(q) ||
          (work.synopsis ?? '').toLowerCase().includes(q) ||
          (work.genres ?? []).some((genre) => genre.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [works, search, typeFilter])

  const films = works.filter((w) => w.work_type === 'filme').length
  const series = works.filter((w) => w.work_type === 'série').length
  const animations = works.filter((w) => w.is_animation).length

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Biblioteca clínica"
        title="Catálogo de obras"
        description="Filmes, séries e animações disponíveis para indicar a pacientes. A indicação individual é feita no perfil de cada paciente."
      />

      <section className="stats-grid four">
        <StatCard label="Total de obras" value={works.length} icon={Film} />
        <StatCard label="Filmes" value={films} icon={Film} tone="blue" />
        <StatCard label="Séries" value={series} icon={Film} tone="navy" />
        <StatCard label="Animações" value={animations} icon={Film} tone="warning" />
      </section>

      <FilterBar>
        <SearchField value={search} onChange={setSearch} placeholder="Buscar por título, sinopse ou gênero..." />
        <FilterSelect value={typeFilter} onChange={setTypeFilter}>
          <option value="all">Todos os tipos</option>
          <option value="filme">Filmes</option>
          <option value="série">Séries</option>
          <option value="animação">Animações</option>
        </FilterSelect>
      </FilterBar>

      <DataState loading={library.isLoading} error={library.error} onRetry={() => library.refetch()}>
        {filtered.length ? (
          <section className="library-work-grid">
            {filtered.map((work) => (
              <article className="library-work-card" key={work.id}>
                {work.cover_url
                  ? <img src={work.cover_url} alt="" />
                  : <div className="library-work-cover"><Film size={28} aria-hidden="true" /></div>
                }
                <div>
                  <div className="library-work-head">
                    <span>{work.work_type}</span>
                    <div className="context-progress-list">
                      {work.is_animation ? <Badge tone="info">Animação</Badge> : null}
                      {work.intensity != null ? <Badge tone="warning">Intensidade {work.intensity}/10</Badge> : null}
                    </div>
                  </div>
                  <strong>{work.display_title}</strong>
                  <p>{work.synopsis || 'Obra disponível no catálogo clínico.'}</p>
                  <div className="goal-meta-row">
                    {work.year ? <span>{work.year}</span> : null}
                    {(work.genres ?? []).slice(0, 3).map((genre) => <span key={`${work.id}-${genre}`}>{genre}</span>)}
                    {work.duration ? <span>{work.duration}</span> : null}
                  </div>
                  {(work.therapist_layer as { clinical_notes?: string })?.clinical_notes ? (
                    <p className="staff-clinical-note">
                      <strong>Notas clínicas: </strong>
                      {(work.therapist_layer as { clinical_notes: string }).clinical_notes}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState
            icon={Film}
            title="Nenhuma obra encontrada"
            description={search || typeFilter !== 'all' ? 'Ajuste os filtros para ver mais resultados.' : 'O catálogo de obras ainda não foi preenchido.'}
          />
        )}
      </DataState>
    </div>
  )
}
