import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenCheck, Edit3, Plus, Trash2 } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { ConfirmDialog } from '../components/design-system/ConfirmDialog'
import { FilterBar, FilterSelect, SearchField } from '../components/design-system/FilterBar'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { deletePsychoeducationModule, listPsychoeducationModules, savePsychoeducationModule } from '../services/supabaseQueries'
import type { PsychoeducationCard, PsychoeducationModuleRow } from '../types'

type PsychoForm = {
  id?: string | null
  number: string
  stage: string
  title: string
  presentation: string
  closing: string
  accent_color: string
  cover_url: string
  cards: PsychoeducationCard[]
}

const emptyCard: PsychoeducationCard = {
  title: '',
  imageUrl: '',
  patientText: '',
  therapistText: '',
  reflection: '',
  exercise: '',
}

const emptyModule: PsychoForm = {
  number: '1',
  stage: 'Conhecer',
  title: '',
  presentation: '',
  closing: '',
  accent_color: '#00B2A9',
  cover_url: '',
  cards: [{ ...emptyCard }],
}

const stages = ['Conhecer', 'Compreender', 'Transformar']

function toForm(module: PsychoeducationModuleRow): PsychoForm {
  return {
    id: module.id,
    number: String(module.number),
    stage: module.stage,
    title: module.title,
    presentation: module.presentation ?? '',
    closing: module.closing ?? '',
    accent_color: module.accent_color ?? '#00B2A9',
    cover_url: module.cover_url ?? '',
    cards: module.cards?.length ? module.cards.map((card) => ({ ...emptyCard, ...card })) : [{ ...emptyCard }],
  }
}

function numberOrOne(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? 1 : Math.max(1, Math.round(parsed))
}

function cleanCards(cards: PsychoeducationCard[]) {
  return cards
    .map((card) => ({
      title: card.title?.trim() || null,
      imageUrl: card.imageUrl?.trim() || null,
      patientText: card.patientText?.trim() || null,
      therapistText: card.therapistText?.trim() || null,
      reflection: card.reflection?.trim() || null,
      exercise: card.exercise?.trim() || null,
    }))
    .filter((card) => card.title || card.patientText || card.therapistText || card.reflection || card.exercise)
}

export function PsychoeducationAdminPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [form, setForm] = useState<PsychoForm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PsychoeducationModuleRow | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const modules = useQuery({ queryKey: ['psychoeducation-modules'], queryFn: listPsychoeducationModules })

  const filtered = useMemo(
    () => (modules.data ?? []).filter((module) => {
      const haystack = `${module.number} ${module.stage} ${module.title} ${module.presentation ?? ''}`.toLowerCase()
      if (search && !haystack.includes(search.toLowerCase())) return false
      if (stageFilter && module.stage !== stageFilter) return false
      return true
    }),
    [modules.data, search, stageFilter],
  )

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['psychoeducation-modules'] })
    await queryClient.invalidateQueries({ queryKey: ['patient-psychoeducation-modules'] })
  }

  const saveMutation = useMutation({
    mutationFn: (input: PsychoForm) => savePsychoeducationModule({
      id: input.id,
      number: numberOrOne(input.number),
      stage: input.stage,
      title: input.title,
      presentation: input.presentation,
      closing: input.closing,
      accent_color: input.accent_color,
      cover_url: input.cover_url,
      cards: cleanCards(input.cards),
    }),
    onSuccess: async () => {
      setForm(null)
      setMessage({ tone: 'success', text: 'Módulo de psicoeducação salvo.' })
      await invalidate()
    },
    onError: (error) => setMessage({ tone: 'error', text: (error as Error).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePsychoeducationModule,
    onSuccess: async () => {
      setDeleteTarget(null)
      setMessage({ tone: 'success', text: 'Módulo excluído.' })
      await invalidate()
    },
    onError: (error) => setMessage({ tone: 'error', text: (error as Error).message }),
  })

  function updateCard(index: number, patch: Partial<PsychoeducationCard>) {
    if (!form) return
    setForm({ ...form, cards: form.cards.map((card, cardIndex) => cardIndex === index ? { ...card, ...patch } : card) })
  }

  function removeCard(index: number) {
    if (!form) return
    setForm({ ...form, cards: form.cards.filter((_, cardIndex) => cardIndex !== index) })
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form?.title.trim()) return
    saveMutation.mutate(form)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Conteúdos terapêuticos"
        title="Psicoeducação"
        description="Catálogo global de módulos em etapas: Conhecer, Compreender e Transformar."
        action={<Button variant="primary" onClick={() => setForm(emptyModule)}><Plus size={16} aria-hidden="true" /> Novo módulo</Button>}
      />

      {message ? <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 5000 : undefined} /> : null}

      <section className="stats-grid three">
        <StatCard label="Módulos" value={modules.data?.length ?? 0} icon={BookOpenCheck} />
        <StatCard label="Etapas" value={new Set((modules.data ?? []).map((module) => module.stage)).size} icon={BookOpenCheck} tone="blue" />
        <StatCard label="Filtrados" value={filtered.length} icon={BookOpenCheck} tone="navy" />
      </section>

      <FilterBar resultCount={filtered.length} resultLabel="módulos">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar por número, etapa ou título" />
        <FilterSelect value={stageFilter} onChange={setStageFilter} label="Filtrar por etapa">
          <option value="">Todas as etapas</option>
          {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
        </FilterSelect>
      </FilterBar>

      <DataState loading={modules.isLoading} error={modules.error} onRetry={() => modules.refetch()}>
        {filtered.length ? (
          <section className="psycho-module-grid">
            {filtered.map((module) => (
              <article className="psycho-module-card" key={module.id} style={{ borderTopColor: module.accent_color ?? 'var(--color-brand-accent)' }}>
                {module.cover_url ? <img src={module.cover_url} alt="" /> : <div className="psycho-module-cover" style={{ background: module.accent_color ?? undefined }}><BookOpenCheck size={26} aria-hidden="true" /></div>}
                <div>
                  <div className="library-work-head">
                    <span>Módulo {module.number}</span>
                    <Badge tone="info">{module.stage}</Badge>
                  </div>
                  <strong>{module.title}</strong>
                  <p>{module.presentation || 'Sem apresentação cadastrada.'}</p>
                  <div className="goal-meta-row"><span>{module.cards?.length ?? 0} cards</span></div>
                  <div className="table-actions">
                    <Button variant="ghost" size="sm" onClick={() => setForm(toForm(module))}><Edit3 size={15} aria-hidden="true" /> Editar</Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(module)}><Trash2 size={15} aria-hidden="true" /> Excluir</Button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState icon={BookOpenCheck} title="Nenhum módulo encontrado" description="Crie módulos numerados para formar a jornada de psicoeducação." />
        )}
      </DataState>

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card wide-modal" onSubmit={submit} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>{form.id ? 'Editar módulo' : 'Novo módulo'}</h2>
              <p>Cards têm texto do paciente e texto profissional separados.</p>
            </header>
            <div className="form-grid two">
              <label>Número<input type="number" min="1" value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} /></label>
              <label>Etapa<select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>{stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>
              <label className="span-two">Título<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
              <label>Cor de destaque<input value={form.accent_color} onChange={(event) => setForm({ ...form, accent_color: event.target.value })} placeholder="#00B2A9" /></label>
              <label>URL da capa<input value={form.cover_url} onChange={(event) => setForm({ ...form, cover_url: event.target.value })} placeholder="https://..." /></label>
              <label className="span-two">Apresentação<textarea value={form.presentation} onChange={(event) => setForm({ ...form, presentation: event.target.value })} /></label>
              <label className="span-two">Fechamento<textarea value={form.closing} onChange={(event) => setForm({ ...form, closing: event.target.value })} /></label>
            </div>

            <div className="psycho-card-editor">
              <div className="panel-header">
                <div><h3>Cards do módulo</h3><p>Organize texto do paciente, conteúdo profissional, reflexão e exercício.</p></div>
                <Button variant="secondary" size="sm" onClick={() => setForm({ ...form, cards: [...form.cards, { ...emptyCard }] })}><Plus size={15} aria-hidden="true" /> Card</Button>
              </div>
              {form.cards.map((card, index) => (
                <section key={index}>
                  <div className="goal-card-head">
                    <strong>Card {index + 1}</strong>
                    <Button variant="ghost" size="sm" onClick={() => removeCard(index)}>Remover</Button>
                  </div>
                  <label>Título<input value={card.title ?? ''} onChange={(event) => updateCard(index, { title: event.target.value })} /></label>
                  <label>Imagem<input value={card.imageUrl ?? ''} onChange={(event) => updateCard(index, { imageUrl: event.target.value })} placeholder="https://..." /></label>
                  <label>Texto do paciente<textarea value={card.patientText ?? ''} onChange={(event) => updateCard(index, { patientText: event.target.value })} /></label>
                  <label>Texto do terapeuta<textarea value={card.therapistText ?? ''} onChange={(event) => updateCard(index, { therapistText: event.target.value })} /></label>
                  <label>Reflexão<textarea value={card.reflection ?? ''} onChange={(event) => updateCard(index, { reflection: event.target.value })} /></label>
                  <label>Exercício<textarea value={card.exercise ?? ''} onChange={(event) => updateCard(index, { exercise: event.target.value })} /></label>
                </section>
              ))}
            </div>

            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar módulo'}</Button>
            </footer>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir módulo"
        description={deleteTarget ? `O módulo "${deleteTarget.title}" será removido da jornada.` : ''}
        confirmLabel="Excluir módulo"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
