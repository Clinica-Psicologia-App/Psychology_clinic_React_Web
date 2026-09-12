import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitBranch, LockKeyhole, Trash2, UserRoundPlus, UsersRound } from 'lucide-react'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { deleteGenogramPerson, deleteGenogramRelationship, getPatientGenogram, saveGenogramPerson, saveGenogramRelationship } from '../../services/supabaseQueries'
import type { GenogramPersonRow, GenogramRelationshipRow, PatientDetailData } from '../../types'

type PersonForm = {
  id?: string | null
  full_name: string
  nickname: string
  relationship_to_patient: string
  gender: string
  birth_year: string
  death_year: string
  is_deceased: boolean
  caregiver_role: string
  illness_type: string
  pregnancy_loss_type: string
  notes: string
  is_sensitive: boolean
}

type RelationshipForm = {
  person_a_id: string
  person_b_id: string
  relationship_type: string
  notes: string
}

const emptyPerson: PersonForm = {
  full_name: '',
  nickname: '',
  relationship_to_patient: '',
  gender: '',
  birth_year: '',
  death_year: '',
  is_deceased: false,
  caregiver_role: '',
  illness_type: '',
  pregnancy_loss_type: '',
  notes: '',
  is_sensitive: false,
}

const emptyRelationship: RelationshipForm = {
  person_a_id: '',
  person_b_id: '',
  relationship_type: 'parental',
  notes: '',
}

const relationshipLabels: Record<string, string> = {
  parental: 'Parental',
  conjugal: 'Conjugal',
  sibling: 'Irmãos',
  conflict: 'Conflito',
  close: 'Vínculo próximo',
  distant: 'Distante',
}

function num(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : Math.round(parsed)
}

function toForm(person: GenogramPersonRow): PersonForm {
  return {
    id: person.id,
    full_name: person.full_name,
    nickname: person.nickname ?? '',
    relationship_to_patient: person.relationship_to_patient ?? '',
    gender: person.gender ?? '',
    birth_year: person.birth_year == null ? '' : String(person.birth_year),
    death_year: person.death_year == null ? '' : String(person.death_year),
    is_deceased: Boolean(person.is_deceased),
    caregiver_role: person.caregiver_role ?? '',
    illness_type: person.illness_type ?? '',
    pregnancy_loss_type: person.pregnancy_loss_type ?? '',
    notes: person.notes ?? '',
    is_sensitive: Boolean(person.is_sensitive),
  }
}

function relationshipName(personsById: Map<string, GenogramPersonRow>, relationship: GenogramRelationshipRow) {
  const a = personsById.get(relationship.person_a_id)?.full_name ?? 'Pessoa A'
  const b = personsById.get(relationship.person_b_id)?.full_name ?? 'Pessoa B'
  return `${a} ↔ ${b}`
}

export function PatientGenogramManager({ data }: { data: PatientDetailData }) {
  const queryClient = useQueryClient()
  const [personForm, setPersonForm] = useState<PersonForm | null>(null)
  const [relationshipForm, setRelationshipForm] = useState<RelationshipForm | null>(null)
  const [deletePersonTarget, setDeletePersonTarget] = useState<GenogramPersonRow | null>(null)
  const [deleteRelationshipTarget, setDeleteRelationshipTarget] = useState<GenogramRelationshipRow | null>(null)

  const genogram = useQuery({
    queryKey: ['patient-genogram', data.patient.id],
    queryFn: () => getPatientGenogram(data.patient.id),
  })

  const persons = useMemo(() => genogram.data?.persons ?? [], [genogram.data?.persons])
  const relationships = useMemo(() => genogram.data?.relationships ?? [], [genogram.data?.relationships])
  const personsById = useMemo(() => new Map(persons.map((person) => [person.id, person])), [persons])
  const grouped = useMemo(() => {
    const groups = new Map<string, GenogramPersonRow[]>()
    for (const person of persons) {
      const key = person.relationship_to_patient || 'Sem relação informada'
      groups.set(key, [...(groups.get(key) ?? []), person])
    }
    return Array.from(groups.entries())
  }, [persons])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['patient-genogram', data.patient.id] })
  }

  const personMutation = useMutation({
    mutationFn: (input: PersonForm) => saveGenogramPerson({
      id: input.id,
      clinic_id: data.patient.clinic_id,
      patient_id: data.patient.id,
      full_name: input.full_name,
      nickname: input.nickname,
      relationship_to_patient: input.relationship_to_patient,
      gender: input.gender,
      birth_year: num(input.birth_year),
      death_year: num(input.death_year),
      is_deceased: input.is_deceased,
      caregiver_role: input.caregiver_role,
      illness_type: input.illness_type,
      pregnancy_loss_type: input.pregnancy_loss_type,
      notes: input.notes,
      is_sensitive: input.is_sensitive,
    }),
    onSuccess: async () => {
      setPersonForm(null)
      await invalidate()
    },
  })

  const deletePersonMutation = useMutation({
    mutationFn: deleteGenogramPerson,
    onSuccess: async () => {
      setDeletePersonTarget(null)
      await invalidate()
    },
  })

  const relationshipMutation = useMutation({
    mutationFn: (input: RelationshipForm) => saveGenogramRelationship({
      clinic_id: data.patient.clinic_id,
      patient_id: data.patient.id,
      person_a_id: input.person_a_id,
      person_b_id: input.person_b_id,
      relationship_type: input.relationship_type,
      notes: input.notes,
    }),
    onSuccess: async () => {
      setRelationshipForm(null)
      await invalidate()
    },
  })

  const deleteRelationshipMutation = useMutation({
    mutationFn: deleteGenogramRelationship,
    onSuccess: async () => {
      setDeleteRelationshipTarget(null)
      await invalidate()
    },
  })

  function submitPerson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!personForm?.full_name.trim()) return
    personMutation.mutate(personForm)
  }

  function submitRelationship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!relationshipForm?.person_a_id || !relationshipForm.person_b_id || relationshipForm.person_a_id === relationshipForm.person_b_id) return
    relationshipMutation.mutate(relationshipForm)
  }

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Módulos avançados</span>
          <h2>Genograma</h2>
          <p>Mapa familiar com pessoas, vínculos e leitura clínica inicial.</p>
        </div>
        <div className="table-actions">
          <Button variant="secondary" size="sm" disabled={persons.length < 2} onClick={() => setRelationshipForm(emptyRelationship)}><GitBranch size={16} aria-hidden="true" /> Novo vínculo</Button>
          <Button variant="primary" size="sm" onClick={() => setPersonForm(emptyPerson)}><UserRoundPlus size={16} aria-hidden="true" /> Nova pessoa</Button>
        </div>
      </div>

      {genogram.error || personMutation.error || relationshipMutation.error || deletePersonMutation.error || deleteRelationshipMutation.error ? (
        <div className="form-step-error">{((genogram.error ?? personMutation.error ?? relationshipMutation.error ?? deletePersonMutation.error ?? deleteRelationshipMutation.error) as Error).message}</div>
      ) : null}

      {persons.length ? (
        <div className="genogram-layout">
          <section className="genogram-diagram" aria-label="Diagrama do genograma">
            <div className="genogram-patient-node">
              <strong>{data.patient.full_name}</strong>
              <span>Paciente</span>
            </div>
            {grouped.map(([group, groupPersons]) => (
              <div className="genogram-family-group" key={group}>
                <h3>{group}</h3>
                <div>
                  {groupPersons.map((person) => (
                    <button type="button" key={person.id} className="genogram-person-node" onClick={() => setPersonForm(toForm(person))}>
                      <strong>{person.nickname || person.full_name}</strong>
                      <span>{person.full_name}</span>
                      {person.is_sensitive ? <LockKeyhole size={13} aria-label="Sensível" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="genogram-side-list">
            <div className="panel-header">
              <div><h3>Vínculos</h3><p>{relationships.length} relacionamento(s) registrados.</p></div>
              <GitBranch size={18} aria-hidden="true" />
            </div>
            {relationships.length ? relationships.map((relationship) => (
              <div className="genogram-relationship-row" key={relationship.id}>
                <div>
                  <strong>{relationshipName(personsById, relationship)}</strong>
                  <span>{relationshipLabels[relationship.relationship_type] ?? relationship.relationship_type}{relationship.notes ? ` · ${relationship.notes}` : ''}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDeleteRelationshipTarget(relationship)} aria-label="Remover vínculo"><Trash2 size={15} /></Button>
              </div>
            )) : <p className="chart-empty">Nenhum vínculo registrado.</p>}
          </section>
        </div>
      ) : (
        <EmptyState icon={UsersRound} title="Genograma ainda vazio" description="Cadastre familiares ou pessoas significativas para iniciar o diagrama." />
      )}

      {personForm ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setPersonForm(null)}>
          <form className="modal-card wide-modal" onSubmit={submitPerson} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>{personForm.id ? 'Editar pessoa' : 'Nova pessoa no genograma'}</h2>
              <p>Registre dados familiares relevantes ao caso.</p>
            </header>
            <div className="form-grid two">
              <label>Nome completo<input autoFocus value={personForm.full_name} onChange={(event) => setPersonForm({ ...personForm, full_name: event.target.value })} required /></label>
              <label>Apelido<input value={personForm.nickname} onChange={(event) => setPersonForm({ ...personForm, nickname: event.target.value })} /></label>
              <label>Relação com paciente<input value={personForm.relationship_to_patient} onChange={(event) => setPersonForm({ ...personForm, relationship_to_patient: event.target.value })} placeholder="Mãe, pai, irmã, avô..." /></label>
              <label>Gênero<input value={personForm.gender} onChange={(event) => setPersonForm({ ...personForm, gender: event.target.value })} /></label>
              <label>Ano nascimento<input type="number" value={personForm.birth_year} onChange={(event) => setPersonForm({ ...personForm, birth_year: event.target.value })} /></label>
              <label>Ano falecimento<input type="number" value={personForm.death_year} onChange={(event) => setPersonForm({ ...personForm, death_year: event.target.value })} /></label>
              <label>Papel de cuidador<input value={personForm.caregiver_role} onChange={(event) => setPersonForm({ ...personForm, caregiver_role: event.target.value })} /></label>
              <label>Adoecimento relevante<input value={personForm.illness_type} onChange={(event) => setPersonForm({ ...personForm, illness_type: event.target.value })} /></label>
              <label className="span-two">Perda gestacional<input value={personForm.pregnancy_loss_type} onChange={(event) => setPersonForm({ ...personForm, pregnancy_loss_type: event.target.value })} /></label>
              <label className="span-two">Notas<textarea value={personForm.notes} onChange={(event) => setPersonForm({ ...personForm, notes: event.target.value })} /></label>
              <label className="check-row"><input type="checkbox" checked={personForm.is_deceased} onChange={(event) => setPersonForm({ ...personForm, is_deceased: event.target.checked })} /> Pessoa falecida</label>
              <label className="check-row"><input type="checkbox" checked={personForm.is_sensitive} onChange={(event) => setPersonForm({ ...personForm, is_sensitive: event.target.checked })} /> Conteúdo sensível</label>
            </div>
            <footer>
              {personForm.id ? <Button variant="danger" type="button" onClick={() => setDeletePersonTarget(personsById.get(personForm.id!) ?? null)}>Excluir</Button> : null}
              <Button variant="ghost" type="button" onClick={() => setPersonForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={personMutation.isPending}>{personMutation.isPending ? 'Salvando...' : 'Salvar pessoa'}</Button>
            </footer>
          </form>
        </div>
      ) : null}

      {relationshipForm ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setRelationshipForm(null)}>
          <form className="modal-card" onSubmit={submitRelationship} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>Novo vínculo</h2>
              <p>Crie uma relação entre duas pessoas do genograma.</p>
            </header>
            <label>Pessoa A<select value={relationshipForm.person_a_id} onChange={(event) => setRelationshipForm({ ...relationshipForm, person_a_id: event.target.value })}>
              <option value="">Selecionar</option>
              {persons.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select></label>
            <label>Pessoa B<select value={relationshipForm.person_b_id} onChange={(event) => setRelationshipForm({ ...relationshipForm, person_b_id: event.target.value })}>
              <option value="">Selecionar</option>
              {persons.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select></label>
            <label>Tipo<select value={relationshipForm.relationship_type} onChange={(event) => setRelationshipForm({ ...relationshipForm, relationship_type: event.target.value })}>
              {Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Notas<textarea value={relationshipForm.notes} onChange={(event) => setRelationshipForm({ ...relationshipForm, notes: event.target.value })} /></label>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setRelationshipForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={relationshipMutation.isPending}>{relationshipMutation.isPending ? 'Salvando...' : 'Salvar vínculo'}</Button>
            </footer>
          </form>
        </div>
      ) : null}

      {deletePersonTarget ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDeletePersonTarget(null)}>
          <section className="modal-card confirm-dialog" onClick={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true">
            <header><h2>Excluir pessoa</h2><p>Remover {deletePersonTarget.full_name}? Exclua vínculos relacionados antes se o banco bloquear a remoção.</p></header>
            <footer>
              <Button variant="ghost" onClick={() => setDeletePersonTarget(null)}>Cancelar</Button>
              <Button variant="danger" disabled={deletePersonMutation.isPending} onClick={() => deletePersonMutation.mutate(deletePersonTarget.id)}>Excluir</Button>
            </footer>
          </section>
        </div>
      ) : null}

      {deleteRelationshipTarget ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDeleteRelationshipTarget(null)}>
          <section className="modal-card confirm-dialog" onClick={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true">
            <header><h2>Remover vínculo</h2><p>{relationshipName(personsById, deleteRelationshipTarget)}</p></header>
            <footer>
              <Button variant="ghost" onClick={() => setDeleteRelationshipTarget(null)}>Cancelar</Button>
              <Button variant="danger" disabled={deleteRelationshipMutation.isPending} onClick={() => deleteRelationshipMutation.mutate(deleteRelationshipTarget.id)}>Remover</Button>
            </footer>
          </section>
        </div>
      ) : null}
    </article>
  )
}
