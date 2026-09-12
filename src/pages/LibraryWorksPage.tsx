import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Film, Plus, Trash2 } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { ConfirmDialog } from '../components/design-system/ConfirmDialog'
import { FilterBar, FilterSelect, SearchField } from '../components/design-system/FilterBar'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { deleteLibraryWork, listLibraryWorks, saveLibraryWork } from '../services/supabaseQueries'
import type { LibraryWorkLayer, LibraryWorkRow } from '../types'

type LibraryForm = {
  id?: string | null
  display_title: string
  work_type: string
  is_animation: boolean
  year: string
  genres: string
  duration: string
  seasons: string
  rating: string
  synopsis: string
  cover_url: string
  intensity: string
  instructions_before: string
  instructions_during: string
  instructions_after: string
  reflection_questions: string
  where_to_watch: string
  clinical_notes: string
  related_schemas: string
  intervention_ideas: string
}

const emptyWork: LibraryForm = {
  display_title: '',
  work_type: 'filme',
  is_animation: false,
  year: '',
  genres: '',
  duration: '',
  seasons: '',
  rating: '',
  synopsis: '',
  cover_url: '',
  intensity: '5',
  instructions_before: '',
  instructions_during: '',
  instructions_after: '',
  reflection_questions: '',
  where_to_watch: '',
  clinical_notes: '',
  related_schemas: '',
  intervention_ideas: '',
}

function listFromText(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinList(value?: string[] | null) {
  return (value ?? []).join(', ')
}

function layer(work: LibraryWorkRow, key: 'patient_layer' | 'therapist_layer') {
  return work[key] ?? {}
}

function toForm(work: LibraryWorkRow): LibraryForm {
  const patient = layer(work, 'patient_layer')
  const therapist = layer(work, 'therapist_layer')
  return {
    id: work.id,
    display_title: work.display_title,
    work_type: work.work_type,
    is_animation: Boolean(work.is_animation),
    year: work.year == null ? '' : String(work.year),
    genres: joinList(work.genres),
    duration: work.duration ?? '',
    seasons: work.seasons == null ? '' : String(work.seasons),
    rating: work.rating ?? '',
    synopsis: work.synopsis ?? '',
    cover_url: work.cover_url ?? '',
    intensity: work.intensity == null ? '5' : String(work.intensity),
    instructions_before: patient.instructions_before ?? '',
    instructions_during: patient.instructions_during ?? '',
    instructions_after: patient.instructions_after ?? '',
    reflection_questions: joinList(patient.reflection_questions),
    where_to_watch: patient.where_to_watch ?? '',
    clinical_notes: therapist.clinical_notes ?? '',
    related_schemas: joinList(therapist.related_schemas),
    intervention_ideas: therapist.intervention_ideas ?? '',
  }
}

function numberOrNull(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function toPayload(form: LibraryForm) {
  const patientLayer: LibraryWorkLayer = {
    instructions_before: form.instructions_before.trim() || null,
    instructions_during: form.instructions_during.trim() || null,
    instructions_after: form.instructions_after.trim() || null,
    reflection_questions: listFromText(form.reflection_questions),
    where_to_watch: form.where_to_watch.trim() || null,
  }
  const therapistLayer: LibraryWorkLayer = {
    clinical_notes: form.clinical_notes.trim() || null,
    related_schemas: listFromText(form.related_schemas),
    intervention_ideas: form.intervention_ideas.trim() || null,
  }

  return {
    id: form.id,
    display_title: form.display_title,
    work_type: form.work_type,
    is_animation: form.is_animation,
    year: numberOrNull(form.year),
    genres: listFromText(form.genres),
    duration: form.duration,
    seasons: numberOrNull(form.seasons),
    rating: form.rating,
    synopsis: form.synopsis,
    cover_url: form.cover_url,
    intensity: numberOrNull(form.intensity),
    patient_layer: patientLayer,
    therapist_layer: therapistLayer,
  }
}

export function LibraryWorksPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [form, setForm] = useState<LibraryForm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LibraryWorkRow | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const works = useQuery({ queryKey: ['library-works'], queryFn: listLibraryWorks })

  const filtered = useMemo(
    () => (works.data ?? []).filter((work) => {
      const haystack = `${work.display_title} ${work.work_type} ${(work.genres ?? []).join(' ')} ${work.synopsis ?? ''}`.toLowerCase()
      if (search && !haystack.includes(search.toLowerCase())) return false
      if (typeFilter && work.work_type !== typeFilter) return false
      return true
    }),
    [search, typeFilter, works.data],
  )

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['library-works'] })
  }

  const saveMutation = useMutation({
    mutationFn: (input: LibraryForm) => saveLibraryWork(toPayload(input)),
    onSuccess: async () => {
      setForm(null)
      setMessage({ tone: 'success', text: 'Obra salva com sucesso.' })
      await invalidate()
    },
    onError: (error) => setMessage({ tone: 'error', text: (error as Error).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLibraryWork,
    onSuccess: async () => {
      setDeleteTarget(null)
      setMessage({ tone: 'success', text: 'Obra excluída da biblioteca.' })
      await invalidate()
    },
    onError: (error) => setMessage({ tone: 'error', text: (error as Error).message }),
  })

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form?.display_title.trim()) return
    saveMutation.mutate(form)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Conteúdos terapêuticos"
        title="Biblioteca cinematográfica"
        description="Catálogo de filmes, séries e animações com camada do paciente separada da camada profissional."
        action={<Button variant="primary" onClick={() => setForm(emptyWork)}><Plus size={16} aria-hidden="true" /> Nova obra</Button>}
      />

      {message ? <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 5000 : undefined} /> : null}

      <section className="stats-grid three">
        <StatCard label="Obras" value={works.data?.length ?? 0} icon={Film} />
        <StatCard label="Animações" value={(works.data ?? []).filter((work) => work.is_animation).length} icon={Film} tone="blue" />
        <StatCard label="Filtradas" value={filtered.length} icon={Film} tone="navy" />
      </section>

      <FilterBar resultCount={filtered.length} resultLabel="obras">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar por título, gênero ou sinopse" />
        <FilterSelect value={typeFilter} onChange={setTypeFilter} label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          <option value="filme">Filme</option>
          <option value="serie">Série</option>
          <option value="documentario">Documentário</option>
          <option value="curta">Curta</option>
        </FilterSelect>
      </FilterBar>

      <DataState loading={works.isLoading} error={works.error} onRetry={() => works.refetch()}>
        {filtered.length ? (
          <section className="library-work-grid">
            {filtered.map((work) => (
              <article className="library-work-card" key={work.id}>
                {work.cover_url ? <img src={work.cover_url} alt="" /> : <div className="library-work-cover"><Film size={28} aria-hidden="true" /></div>}
                <div>
                  <div className="library-work-head">
                    <span>{work.work_type}</span>
                    <Badge tone={work.is_animation ? 'info' : 'neutral'}>{work.is_animation ? 'Animação' : `${work.intensity ?? '-'} intensidade`}</Badge>
                  </div>
                  <strong>{work.display_title}</strong>
                  <p>{work.synopsis || 'Sem sinopse cadastrada.'}</p>
                  <div className="goal-meta-row">
                    {work.year ? <span>{work.year}</span> : null}
                    {work.rating ? <span>{work.rating}</span> : null}
                    {(work.genres ?? []).slice(0, 3).map((genre) => <span key={`${work.id}-${genre}`}>{genre}</span>)}
                  </div>
                  <div className="table-actions">
                    <Button variant="ghost" size="sm" onClick={() => setForm(toForm(work))}><Edit3 size={15} aria-hidden="true" /> Editar</Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(work)}><Trash2 size={15} aria-hidden="true" /> Excluir</Button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState icon={Film} title="Nenhuma obra encontrada" description="Cadastre obras com camadas diferentes para paciente e terapeuta." />
        )}
      </DataState>

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card wide-modal" onSubmit={submit} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>{form.id ? 'Editar obra' : 'Nova obra'}</h2>
              <p>O paciente verá somente a camada do paciente; a camada profissional fica para curadoria clínica.</p>
            </header>
            <div className="form-grid two">
              <label className="span-two">Título<input autoFocus value={form.display_title} onChange={(event) => setForm({ ...form, display_title: event.target.value })} required /></label>
              <label>Tipo<select value={form.work_type} onChange={(event) => setForm({ ...form, work_type: event.target.value })}>
                <option value="filme">Filme</option>
                <option value="serie">Série</option>
                <option value="documentario">Documentário</option>
                <option value="curta">Curta</option>
              </select></label>
              <label>Ano<input type="number" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></label>
              <label>Gêneros<input value={form.genres} onChange={(event) => setForm({ ...form, genres: event.target.value })} placeholder="Drama, família, ansiedade" /></label>
              <label>Classificação<input value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} placeholder="Ex.: 12+" /></label>
              <label>Duração<input value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></label>
              <label>Temporadas<input type="number" value={form.seasons} onChange={(event) => setForm({ ...form, seasons: event.target.value })} /></label>
              <label>Intensidade<input type="number" min="0" max="10" value={form.intensity} onChange={(event) => setForm({ ...form, intensity: event.target.value })} /></label>
              <label className="check-row"><input type="checkbox" checked={form.is_animation} onChange={(event) => setForm({ ...form, is_animation: event.target.checked })} /> É animação</label>
              <label className="span-two">URL da capa<input value={form.cover_url} onChange={(event) => setForm({ ...form, cover_url: event.target.value })} placeholder="https://..." /></label>
              <label className="span-two">Sinopse<textarea value={form.synopsis} onChange={(event) => setForm({ ...form, synopsis: event.target.value })} /></label>
            </div>

            <div className="library-layer-grid">
              <section>
                <h3>Camada do paciente</h3>
                <label>Antes de assistir<textarea value={form.instructions_before} onChange={(event) => setForm({ ...form, instructions_before: event.target.value })} /></label>
                <label>Durante<textarea value={form.instructions_during} onChange={(event) => setForm({ ...form, instructions_during: event.target.value })} /></label>
                <label>Depois<textarea value={form.instructions_after} onChange={(event) => setForm({ ...form, instructions_after: event.target.value })} /></label>
                <label>Perguntas reflexivas<textarea value={form.reflection_questions} onChange={(event) => setForm({ ...form, reflection_questions: event.target.value })} placeholder="Uma por linha ou separadas por vírgula" /></label>
                <label>Onde assistir<input value={form.where_to_watch} onChange={(event) => setForm({ ...form, where_to_watch: event.target.value })} /></label>
              </section>
              <section>
                <h3>Camada do terapeuta</h3>
                <label>Notas clínicas<textarea value={form.clinical_notes} onChange={(event) => setForm({ ...form, clinical_notes: event.target.value })} /></label>
                <label>Esquemas relacionados<textarea value={form.related_schemas} onChange={(event) => setForm({ ...form, related_schemas: event.target.value })} placeholder="Uma por linha ou separados por vírgula" /></label>
                <label>Ideias de intervenção<textarea value={form.intervention_ideas} onChange={(event) => setForm({ ...form, intervention_ideas: event.target.value })} /></label>
              </section>
            </div>

            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar obra'}</Button>
            </footer>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir obra"
        description={deleteTarget ? `A obra "${deleteTarget.display_title}" será removida da biblioteca.` : ''}
        confirmLabel="Excluir obra"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
