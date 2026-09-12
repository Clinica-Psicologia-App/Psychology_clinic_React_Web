import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, LockKeyhole, UsersRound } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { getPatientPortalGenogram } from '../services/supabaseQueries'
import type { GenogramPersonRow } from '../types'

const relationshipLabels: Record<string, string> = {
  parental: 'Parental',
  conjugal: 'Conjugal',
  sibling: 'Irmãos',
  conflict: 'Conflito',
  close: 'Vínculo próximo',
  distant: 'Distante',
}

export function PatientGenogramPage() {
  const genogram = useQuery({ queryKey: ['patient-portal-genogram'], queryFn: getPatientPortalGenogram })
  const persons = useMemo(() => genogram.data?.persons ?? [], [genogram.data?.persons])
  const relationships = genogram.data?.relationships ?? []
  const personsById = useMemo(() => new Map(persons.map((person) => [person.id, person])), [persons])
  const grouped = useMemo(() => {
    const groups = new Map<string, GenogramPersonRow[]>()
    for (const person of persons) {
      const key = person.relationship_to_patient || 'Sem relação informada'
      groups.set(key, [...(groups.get(key) ?? []), person])
    }
    return Array.from(groups.entries())
  }, [persons])

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Meu genograma"
        description="Visualize pessoas e vínculos familiares registrados no seu acompanhamento."
      />

      <section className="stats-grid three">
        <StatCard label="Pessoas" value={persons.length} icon={UsersRound} />
        <StatCard label="Vínculos" value={relationships.length} icon={GitBranch} tone="blue" />
        <StatCard label="Sensíveis" value={persons.filter((person) => person.is_sensitive).length} icon={LockKeyhole} tone="navy" />
      </section>

      <DataState loading={genogram.isLoading} error={genogram.error} onRetry={() => genogram.refetch()}>
        {persons.length ? (
          <div className="genogram-layout">
            <section className="genogram-diagram" aria-label="Diagrama do genograma">
              {grouped.map(([group, groupPersons]) => (
                <div className="genogram-family-group" key={group}>
                  <h3>{group}</h3>
                  <div>
                    {groupPersons.map((person) => (
                      <article key={person.id} className="genogram-person-node patient-readonly">
                        <strong>{person.nickname || person.full_name}</strong>
                        <span>{person.full_name}</span>
                        {person.birth_year ? <span>{person.birth_year}{person.death_year ? `-${person.death_year}` : ''}</span> : null}
                        {person.is_sensitive ? <LockKeyhole size={13} aria-label="Sensível" /> : null}
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="genogram-side-list">
              <div className="panel-header">
                <div><h3>Vínculos</h3><p>Relacionamentos registrados no genograma.</p></div>
                <GitBranch size={18} aria-hidden="true" />
              </div>
              {relationships.length ? relationships.map((relationship) => (
                <div className="genogram-relationship-row" key={relationship.id}>
                  <div>
                    <strong>{personsById.get(relationship.person_a_id)?.full_name ?? 'Pessoa A'} ↔ {personsById.get(relationship.person_b_id)?.full_name ?? 'Pessoa B'}</strong>
                    <span>{relationshipLabels[relationship.relationship_type] ?? relationship.relationship_type}</span>
                  </div>
                  <Badge tone="neutral">Vínculo</Badge>
                </div>
              )) : <p className="chart-empty">Nenhum vínculo registrado.</p>}
            </section>
          </div>
        ) : (
          <EmptyState icon={UsersRound} title="Genograma ainda vazio" description="Quando seu psicólogo registrar pessoas e vínculos, eles aparecerão aqui." />
        )}
      </DataState>
    </div>
  )
}
