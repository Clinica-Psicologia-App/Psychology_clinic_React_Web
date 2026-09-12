import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ClipboardList, Copy, Edit3, Eye, Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { ConfirmDialog } from '../components/design-system/ConfirmDialog'
import { FilterBar, SearchField } from '../components/design-system/FilterBar'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { Badge, DataState, PageHeader } from '../components/Ui'
import {
  archiveQuestionnaire,
  deleteQuestion,
  deleteQuestionnaireDraft,
  duplicateQuestionnaireAsDraft,
  getQuestionnaire,
  isQuestionnaireEditable,
  listQuestionnaires,
  normalizeQuestion,
  publishQuestionnaire,
  saveQuestion,
  saveQuestionnaireDraft,
} from '../services/supabaseQueries'
import type { QuestionnaireCatalogItem, QuestionnaireDetail, QuestionnaireQuestion } from '../types'

type DraftForm = {
  id?: string | null
  code: string
  name: string
  description: string
  author_name: string
  instrument_version: string
  citation: string
  license_notes: string
  reference_period: string
  scale_min: string
  scale_max: string
}

type QuestionForm = {
  id?: string | null
  code: string
  text: string
  order_index: string
  answer_type: string
  scale_min: string
  scale_max: string
  weight: string
  reverse_score: boolean
}

type DuplicateForm = {
  id: string
  name: string
  code: string
  version: string
}

const emptyDraft: DraftForm = {
  code: '',
  name: '',
  description: '',
  author_name: '',
  instrument_version: '1.0',
  citation: '',
  license_notes: '',
  reference_period: 'unspecified',
  scale_min: '1',
  scale_max: '5',
}

const emptyQuestion: QuestionForm = {
  code: '',
  text: '',
  order_index: '0',
  answer_type: 'likert_scale',
  scale_min: '1',
  scale_max: '5',
  weight: '1',
  reverse_score: false,
}

function countQuestions(item: QuestionnaireCatalogItem) {
  return item.question_count ?? item.questions_count ?? 0
}

function countResponses(item: QuestionnaireCatalogItem) {
  return item.response_count ?? item.responses_count ?? 0
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback
}

function bool(value: unknown) {
  return value === true
}

function draftFromItem(item: QuestionnaireCatalogItem): DraftForm {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? '',
    author_name: item.author_name ?? '',
    instrument_version: item.instrument_version ?? item.version ?? '1.0',
    citation: item.citation ?? '',
    license_notes: item.license_notes ?? '',
    reference_period: item.reference_period ?? 'unspecified',
    scale_min: String(item.scale_min ?? 1),
    scale_max: String(item.scale_max ?? 5),
  }
}

function draftFromDetail(detail: QuestionnaireDetail): DraftForm {
  const q = detail.questionnaire
  const v = detail.version
  return {
    id: str(q.id),
    code: str(q.code),
    name: str(q.name),
    description: str(q.description),
    author_name: str(q.author_name),
    instrument_version: str(q.instrument_version, str(v.version, '1.0')),
    citation: str(q.citation),
    license_notes: str(q.license_notes),
    reference_period: str(v.reference_period, 'unspecified'),
    scale_min: String(num(v.scale_min, 1)),
    scale_max: String(num(v.scale_max, 5)),
  }
}

function questionFromDetail(question: QuestionnaireQuestion): QuestionForm {
  const normalized = normalizeQuestion(question)
  return {
    id: normalized.id,
    code: normalized.code,
    text: normalized.text,
    order_index: String(normalized.order_index),
    answer_type: normalized.answer_type,
    scale_min: String(normalized.scale_min),
    scale_max: String(normalized.scale_max),
    weight: String(normalized.weight),
    reverse_score: normalized.reverse_score,
  }
}

function clinicalStatusTone(status?: string | null, isActive?: boolean) {
  if (status === 'draft') return 'neutral' as const
  if (status === 'suspended' || status === 'archived') return 'warning' as const
  if (isActive) return 'success' as const
  return 'info' as const
}

function clinicalStatusLabel(status?: string | null, isActive?: boolean) {
  if (status === 'draft') return 'Rascunho'
  if (status === 'validation') return 'Em validação'
  if (status === 'approved' || isActive) return 'Publicado'
  if (status === 'suspended') return 'Suspenso'
  if (status === 'archived') return 'Arquivado'
  return status ?? (isActive ? 'Publicado' : 'Rascunho')
}

export function QuestionnairesPage() {
  const [search, setSearch] = useState('')
  const [draftForm, setDraftForm] = useState<DraftForm | null>(null)
  const [questionForm, setQuestionForm] = useState<QuestionForm | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [deleteDraftId, setDeleteDraftId] = useState<string | null>(null)
  const [pendingQuestionDelete, setPendingQuestionDelete] = useState<{ questionnaireId: string; questionId: string } | null>(null)
  const [duplicateForm, setDuplicateForm] = useState<DuplicateForm | null>(null)
  const queryClient = useQueryClient()

  const list = useQuery({ queryKey: ['questionnaires'], queryFn: listQuestionnaires })
  const detail = useQuery({
    queryKey: ['questionnaire-detail', selectedId],
    queryFn: () => getQuestionnaire(selectedId!),
    enabled: Boolean(selectedId),
  })

  const filtered = useMemo(
    () => (list.data ?? []).filter((item) => `${item.name} ${item.code} ${item.clinical_status ?? ''}`.toLowerCase().includes(search.toLowerCase())),
    [list.data, search],
  )

  const invalidate = async (id?: string | null) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] }),
      id ? queryClient.invalidateQueries({ queryKey: ['questionnaire-detail', id] }) : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }

  const draftMutation = useMutation({
    mutationFn: (input: DraftForm) => saveQuestionnaireDraft({
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description,
      author_name: input.author_name,
      instrument_version: input.instrument_version,
      citation: input.citation,
      license_notes: input.license_notes,
      reference_period: input.reference_period,
      scale_min: Number(input.scale_min),
      scale_max: Number(input.scale_max),
    }),
    onSuccess: async (id) => {
      setDraftForm(null)
      setSelectedId(id)
      setMessage({ tone: 'success', text: 'Rascunho salvo com sucesso.' })
      await invalidate(id)
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const questionMutation = useMutation({
    mutationFn: (input: QuestionForm) => saveQuestion({
      questionnaire_id: selectedId!,
      question_id: input.id,
      code: input.code,
      text: input.text,
      order_index: Number(input.order_index),
      answer_type: input.answer_type,
      scale_min: Number(input.scale_min),
      scale_max: Number(input.scale_max),
      weight: Number(input.weight),
      reverse_score: input.reverse_score,
    }),
    onSuccess: async () => {
      setQuestionForm(null)
      setMessage({ tone: 'success', text: 'Pergunta salva com sucesso.' })
      await invalidate(selectedId)
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const actionMutation = useMutation({
    mutationFn: async ({ action, id }: { action: string; id: string }) => {
      if (action === 'publish') return publishQuestionnaire(id)
      if (action === 'archive') return archiveQuestionnaire(id)
      if (action === 'deleteDraft') return deleteQuestionnaireDraft(id)
      throw new Error('Ação inválida')
    },
    onSuccess: async (_, variables) => {
      setDeleteDraftId(null)
      setMessage({ tone: 'success', text: 'Ação concluída com sucesso.' })
      if (variables.action === 'deleteDraft') setSelectedId(null)
      await invalidate(variables.id)
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const deleteQuestionMutation = useMutation({
    mutationFn: ({ questionnaireId, questionId }: { questionnaireId: string; questionId: string }) => deleteQuestion(questionnaireId, questionId),
    onSuccess: async () => {
      setPendingQuestionDelete(null)
      setMessage({ tone: 'success', text: 'Pergunta excluída.' })
      await invalidate(selectedId)
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const duplicateMutation = useMutation({
    mutationFn: ({ id, code, version }: { id: string; code: string; version: string }) => duplicateQuestionnaireAsDraft(id, code, version),
    onSuccess: async (id) => {
      setDuplicateForm(null)
      setSelectedId(id)
      setMessage({ tone: 'success', text: 'Questionário duplicado como rascunho.' })
      await invalidate(id)
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  function submitDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draftForm?.code.trim() || !draftForm.name.trim()) return
    draftMutation.mutate(draftForm)
  }

  function submitQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedId || !questionForm?.code.trim() || !questionForm.text.trim()) return
    questionMutation.mutate(questionForm)
  }

  function openDuplicate(item: QuestionnaireCatalogItem) {
    setDuplicateForm({
      id: item.id,
      name: item.name,
      code: `${item.code}_V${Date.now().toString().slice(-4)}`,
      version: '1.0',
    })
  }

  function submitDuplicate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!duplicateForm?.code.trim() || !duplicateForm.version.trim()) return
    duplicateMutation.mutate({
      id: duplicateForm.id,
      code: duplicateForm.code.trim(),
      version: duplicateForm.version.trim(),
    })
  }

  function currentEditable() {
    const q = detail.data?.questionnaire
    return q ? isQuestionnaireEditable({ is_active: bool(q.is_active), clinical_status: str(q.clinical_status, 'draft') }) : false
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Governança clínica"
        title="Questionários"
        description="Crie rascunhos, gerencie perguntas, publique versões e arquive instrumentos."
        action={<Button variant="primary" onClick={() => setDraftForm(emptyDraft)}><Plus size={16} aria-hidden="true" /> Novo questionário</Button>}
      />
      {message ? <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 5000 : undefined} /> : null}
      <FilterBar resultCount={filtered.length} resultLabel="instrumentos">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar por nome, código ou status" />
      </FilterBar>
      <DataState loading={list.isLoading} error={list.error}>
        <section className="card-grid questionnaires-grid">
          {filtered.map((item) => {
            const editable = isQuestionnaireEditable(item)
            return (
              <article className="entity-card tall" key={item.id}>
                <div className="entity-icon"><ClipboardList size={22} /></div>
                <div className="entity-main">
                  <div className="entity-title-row">
                    <h3>{item.name}</h3>
                    <Badge tone={clinicalStatusTone(item.clinical_status, item.is_active)}>{clinicalStatusLabel(item.clinical_status, item.is_active)}</Badge>
                    {!isQuestionnaireEditable(item) ? <Badge tone="info">Imutável</Badge> : null}
                  </div>
                  <p>{item.description || 'Sem descrição cadastrada.'}</p>
                  <div className="badge-row">
                    <span className="badge">{item.code}</span>
                    <span className="badge">Versão {item.instrument_version ?? item.version ?? 'não informada'}</span>
                    <span className="badge">{countQuestions(item)} questões</span>
                    <span className="badge">{countResponses(item)} respostas</span>
                  </div>
                  <div className="action-row">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(item.id)}><Eye size={16} aria-hidden="true" /> Abrir</Button>
                    {editable ? <Button variant="ghost" size="sm" onClick={() => setDraftForm(draftFromItem(item))}><Edit3 size={16} aria-hidden="true" /> Editar</Button> : null}
                    {editable ? <Button variant="primary" size="sm" onClick={() => actionMutation.mutate({ action: 'publish', id: item.id })}><Send size={16} aria-hidden="true" /> Publicar</Button> : null}
                    {item.is_active ? <Button variant="ghost" size="sm" onClick={() => actionMutation.mutate({ action: 'archive', id: item.id })}><Archive size={16} aria-hidden="true" /> Arquivar</Button> : null}
                    {!editable ? <Button variant="ghost" size="sm" onClick={() => openDuplicate(item)}><Copy size={16} aria-hidden="true" /> Duplicar</Button> : null}
                    {editable && countResponses(item) === 0 ? <Button variant="danger" size="sm" onClick={() => setDeleteDraftId(item.id)}><Trash2 size={16} aria-hidden="true" /> Excluir</Button> : null}
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      </DataState>

      {selectedId ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="modal-card wide">
            <header>
              <h2>{str(detail.data?.questionnaire.name, 'Detalhe do questionário')}</h2>
              <p>{str(detail.data?.questionnaire.code)} · {str(detail.data?.questionnaire.clinical_status, 'draft')}</p>
            </header>
            <DataState loading={detail.isLoading} error={detail.error}>
              <div className="badge-row">
                <span className="badge">Versão {str(detail.data?.version.version, '1.0')}</span>
                <span className="badge">Escala {String(detail.data?.version.scale_min ?? 1)}-{String(detail.data?.version.scale_max ?? 5)}</span>
                <span className="badge">{detail.data?.questions.length ?? 0} perguntas</span>
              </div>
              <div className="action-row">
                {currentEditable() ? <Button variant="primary" size="sm" onClick={() => setQuestionForm({ ...emptyQuestion, order_index: String((detail.data?.questions.length ?? 0) + 1), scale_min: String(detail.data?.version.scale_min ?? 1), scale_max: String(detail.data?.version.scale_max ?? 5) })}><Plus size={16} aria-hidden="true" /> Nova pergunta</Button> : null}
                {currentEditable() && detail.data ? <Button variant="ghost" size="sm" onClick={() => setDraftForm(draftFromDetail(detail.data))}><Edit3 size={16} aria-hidden="true" /> Editar dados</Button> : null}
              </div>
              <div className="table-card compact-table">
                <table>
                  <thead><tr><th>Ordem</th><th>Código</th><th>Pergunta</th><th>Escala</th><th>Peso</th><th>Ações</th></tr></thead>
                  <tbody>
                    {(detail.data?.questions ?? []).map((question) => {
                      const normalized = normalizeQuestion(question)
                      return (
                        <tr key={normalized.id}>
                          <td>{normalized.order_index}</td>
                          <td>{normalized.code}</td>
                          <td>{normalized.text}</td>
                          <td>{normalized.scale_min}-{normalized.scale_max}{normalized.reverse_score ? ' · reversa' : ''}</td>
                          <td>{normalized.weight}</td>
                          <td><div className="table-actions">{currentEditable() ? <Button variant="ghost" size="icon" onClick={() => setQuestionForm(questionFromDetail(normalized))}><Edit3 size={16} /></Button> : null}{currentEditable() ? <Button variant="danger" size="icon" onClick={() => setPendingQuestionDelete({ questionnaireId: selectedId, questionId: normalized.id })}><Trash2 size={16} /></Button> : null}</div></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </DataState>
            <footer><Button variant="ghost" type="button" onClick={() => { setSelectedId(null); setQuestionForm(null) }}>Fechar</Button></footer>
          </section>
        </div>
      ) : null}

      {duplicateForm ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={(event) => event.target === event.currentTarget && setDuplicateForm(null)}>
          <form className="modal-card" onSubmit={submitDuplicate}>
            <header>
              <h2>Duplicar como rascunho</h2>
              <p>Cria uma cópia editável de «{duplicateForm.name}» sem alterar o instrumento original.</p>
            </header>
            <div className="form-grid">
              <label>
                Novo código
                <input value={duplicateForm.code} onChange={(event) => setDuplicateForm({ ...duplicateForm, code: event.target.value })} required />
              </label>
              <label>
                Nova versão
                <input value={duplicateForm.version} onChange={(event) => setDuplicateForm({ ...duplicateForm, version: event.target.value })} required />
              </label>
            </div>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setDuplicateForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={duplicateMutation.isPending}>{duplicateMutation.isPending ? 'Duplicando...' : 'Criar rascunho'}</Button>
            </footer>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteDraftId)}
        title="Excluir rascunho"
        description="Este rascunho será removido definitivamente. Instrumentos com respostas não podem ser excluídos."
        confirmLabel="Excluir rascunho"
        loading={actionMutation.isPending}
        onCancel={() => setDeleteDraftId(null)}
        onConfirm={() => deleteDraftId && actionMutation.mutate({ action: 'deleteDraft', id: deleteDraftId })}
      />

      <ConfirmDialog
        open={Boolean(pendingQuestionDelete)}
        title="Excluir pergunta"
        description="A pergunta será removida do rascunho do instrumento."
        confirmLabel="Excluir pergunta"
        loading={deleteQuestionMutation.isPending}
        onCancel={() => setPendingQuestionDelete(null)}
        onConfirm={() => pendingQuestionDelete && deleteQuestionMutation.mutate(pendingQuestionDelete)}
      />

      {draftForm ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal-card wide" onSubmit={submitDraft}>
            <header><h2>{draftForm.id ? 'Editar rascunho' : 'Novo questionário'}</h2><p>Publicados são imutáveis; para alterar um publicado, duplique como rascunho.</p></header>
            <div className="form-grid two">
              <label>Código<input value={draftForm.code} onChange={(event) => setDraftForm({ ...draftForm, code: event.target.value })} required /></label>
              <label>Nome<input value={draftForm.name} onChange={(event) => setDraftForm({ ...draftForm, name: event.target.value })} required /></label>
              <label>Versão<input value={draftForm.instrument_version} onChange={(event) => setDraftForm({ ...draftForm, instrument_version: event.target.value })} required /></label>
              <label>Período de referência<input value={draftForm.reference_period} onChange={(event) => setDraftForm({ ...draftForm, reference_period: event.target.value })} /></label>
              <label>Escala mínima<input type="number" value={draftForm.scale_min} onChange={(event) => setDraftForm({ ...draftForm, scale_min: event.target.value })} /></label>
              <label>Escala máxima<input type="number" value={draftForm.scale_max} onChange={(event) => setDraftForm({ ...draftForm, scale_max: event.target.value })} /></label>
              <label>Autor<input value={draftForm.author_name} onChange={(event) => setDraftForm({ ...draftForm, author_name: event.target.value })} /></label>
              <label>Licença<input value={draftForm.license_notes} onChange={(event) => setDraftForm({ ...draftForm, license_notes: event.target.value })} /></label>
              <label className="span-two">Descrição<textarea value={draftForm.description} onChange={(event) => setDraftForm({ ...draftForm, description: event.target.value })} /></label>
              <label className="span-two">Citação<textarea value={draftForm.citation} onChange={(event) => setDraftForm({ ...draftForm, citation: event.target.value })} /></label>
            </div>
            <footer><Button variant="ghost" type="button" onClick={() => setDraftForm(null)}>Cancelar</Button><Button variant="primary" type="submit" disabled={draftMutation.isPending}>{draftMutation.isPending ? 'Salvando...' : 'Salvar rascunho'}</Button></footer>
          </form>
        </div>
      ) : null}

      {questionForm ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal-card wide" onSubmit={submitQuestion}>
            <header><h2>{questionForm.id ? 'Editar pergunta' : 'Nova pergunta'}</h2><p>As perguntas só podem ser alteradas enquanto o instrumento está em rascunho.</p></header>
            <div className="form-grid two">
              <label>Código<input value={questionForm.code} onChange={(event) => setQuestionForm({ ...questionForm, code: event.target.value })} required /></label>
              <label>Ordem<input type="number" min="0" value={questionForm.order_index} onChange={(event) => setQuestionForm({ ...questionForm, order_index: event.target.value })} required /></label>
              <label>Tipo<select value={questionForm.answer_type} onChange={(event) => setQuestionForm({ ...questionForm, answer_type: event.target.value })}><option value="likert_scale">Likert</option><option value="numeric">Numérico</option><option value="boolean">Sim/Não</option><option value="text">Texto</option></select></label>
              <label>Peso<input type="number" step="0.1" min="0.1" value={questionForm.weight} onChange={(event) => setQuestionForm({ ...questionForm, weight: event.target.value })} /></label>
              <label>Escala mínima<input type="number" value={questionForm.scale_min} onChange={(event) => setQuestionForm({ ...questionForm, scale_min: event.target.value })} /></label>
              <label>Escala máxima<input type="number" value={questionForm.scale_max} onChange={(event) => setQuestionForm({ ...questionForm, scale_max: event.target.value })} /></label>
              <label className="span-two">Texto<textarea value={questionForm.text} onChange={(event) => setQuestionForm({ ...questionForm, text: event.target.value })} required /></label>
              <label className="check-row span-two"><input type="checkbox" checked={questionForm.reverse_score} onChange={(event) => setQuestionForm({ ...questionForm, reverse_score: event.target.checked })} /> Pontuação reversa</label>
            </div>
            <footer><Button variant="ghost" type="button" onClick={() => setQuestionForm(null)}>Cancelar</Button><Button variant="primary" type="submit" disabled={questionMutation.isPending}>{questionMutation.isPending ? 'Salvando...' : 'Salvar pergunta'}</Button></footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}
