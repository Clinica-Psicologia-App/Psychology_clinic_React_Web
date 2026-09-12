import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, BookOpenCheck, Edit3, ExternalLink, Plus, RotateCcw } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { FilterBar, FilterSelect, SearchField } from '../components/design-system/FilterBar'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { listTherapyResources, saveTherapyResource, setTherapyResourceActive } from '../services/supabaseQueries'
import type { TherapyResourceRow } from '../types'

type ResourceForm = {
  id?: string | null
  title: string
  type: string
  description: string
  url: string
  is_active: boolean
}

const emptyResource: ResourceForm = {
  title: '',
  type: 'material',
  description: '',
  url: '',
  is_active: true,
}

function toForm(resource: TherapyResourceRow): ResourceForm {
  return {
    id: resource.id,
    title: resource.title,
    type: resource.type,
    description: resource.description ?? '',
    url: resource.url ?? '',
    is_active: resource.is_active,
  }
}

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

export function TherapyResourcesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState<ResourceForm | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null)

  const resources = useQuery({ queryKey: ['therapy-resources'], queryFn: listTherapyResources })

  const filtered = useMemo(
    () => (resources.data ?? []).filter((resource) => {
      const haystack = `${resource.title} ${resource.type} ${resource.description ?? ''}`.toLowerCase()
      if (search && !haystack.includes(search.toLowerCase())) return false
      if (statusFilter === 'active' && !resource.is_active) return false
      if (statusFilter === 'inactive' && resource.is_active) return false
      return true
    }),
    [resources.data, search, statusFilter],
  )

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['therapy-resources'] })
  }

  const saveMutation = useMutation({
    mutationFn: saveTherapyResource,
    onSuccess: async () => {
      setForm(null)
      setMessage({ tone: 'success', text: 'Recurso terapêutico salvo com sucesso.' })
      await invalidate()
    },
    onError: (error) => setMessage({ tone: 'error', text: (error as Error).message }),
  })

  const statusMutation = useMutation({
    mutationFn: setTherapyResourceActive,
    onSuccess: async () => {
      setMessage({ tone: 'success', text: 'Status do recurso atualizado.' })
      await invalidate()
    },
    onError: (error) => setMessage({ tone: 'error', text: (error as Error).message }),
  })

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form?.title.trim()) return
    saveMutation.mutate(form)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Conteúdos terapêuticos"
        title="Recursos da clínica"
        description="Cadastre materiais, exercícios, vídeos e links que podem ser liberados no prontuário do paciente."
        action={<Button variant="primary" onClick={() => setForm(emptyResource)}><Plus size={16} aria-hidden="true" /> Novo recurso</Button>}
      />

      {message ? (
        <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 5000 : undefined} />
      ) : null}

      <section className="stats-grid three">
        <StatCard label="Recursos" value={resources.data?.length ?? 0} icon={BookOpenCheck} />
        <StatCard label="Ativos" value={(resources.data ?? []).filter((resource) => resource.is_active).length} icon={BookOpenCheck} tone="blue" />
        <StatCard label="Filtrados" value={filtered.length} icon={BookOpenCheck} tone="navy" />
      </section>

      <FilterBar resultCount={filtered.length} resultLabel="recursos">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar por título, tipo ou descrição" />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </FilterSelect>
      </FilterBar>

      <DataState loading={resources.isLoading} error={resources.error} onRetry={() => resources.refetch()}>
        {filtered.length ? (
          <section className="resource-catalog-grid">
            {filtered.map((resource) => (
              <article className="resource-card" key={resource.id}>
                <div className="resource-card-head">
                  <div>
                    <span>{resourceTypeLabel(resource.type)}</span>
                    <strong>{resource.title}</strong>
                  </div>
                  <Badge tone={resource.is_active ? 'success' : 'neutral'}>{resource.is_active ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <p>{resource.description || 'Sem descrição.'}</p>
                <div className="table-actions">
                  {resource.url ? <a className="btn btn-ghost btn-sm" href={resource.url} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" /> Abrir</a> : null}
                  <Button variant="ghost" size="sm" onClick={() => setForm(toForm(resource))}><Edit3 size={15} aria-hidden="true" /> Editar</Button>
                  <Button
                    variant={resource.is_active ? 'danger' : 'secondary'}
                    size="sm"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: resource.id, is_active: !resource.is_active })}
                  >
                    {resource.is_active ? <Archive size={15} aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />}
                    {resource.is_active ? 'Inativar' : 'Reativar'}
                  </Button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState icon={BookOpenCheck} title="Nenhum recurso encontrado" description="Cadastre recursos terapêuticos da clínica para liberar no prontuário do paciente." />
        )}
      </DataState>

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card" onSubmit={submit} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>{form.id ? 'Editar recurso' : 'Novo recurso'}</h2>
              <p>Recursos ativos podem ser liberados individualmente no prontuário do paciente.</p>
            </header>
            <label>Título<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
            <div className="form-grid two">
              <label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                <option value="material">Material</option>
                <option value="video">Vídeo</option>
                <option value="audio">Áudio</option>
                <option value="exercise">Exercício</option>
                <option value="article">Artigo</option>
                <option value="worksheet">Ficha prática</option>
              </select></label>
              <label>Status<select value={form.is_active ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, is_active: event.target.value === 'active' })}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select></label>
              <label className="span-two">URL<input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://..." /></label>
              <label className="span-two">Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            </div>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar recurso'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}
