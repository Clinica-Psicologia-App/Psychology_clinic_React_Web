import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Archive, CheckCircle2, Edit3, Plus, RotateCcw, Target } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { formatDate } from '../../lib/format'
import { createTherapyGoal, setTherapyGoalStatus, updateTherapyGoal } from '../../services/supabaseQueries'
import type { PatientDetailData, TherapyGoalRow } from '../../types'

type GoalForm = {
  id?: string
  title: string
  description: string
  target_date: string
  progress: string
  linked_schemas: string
}

const emptyGoal: GoalForm = {
  title: '',
  description: '',
  target_date: '',
  progress: '0',
  linked_schemas: '',
}

function goalTone(status: TherapyGoalRow['status']) {
  if (status === 'completed') return 'success' as const
  if (status === 'archived') return 'neutral' as const
  return 'info' as const
}

function goalLabel(status: TherapyGoalRow['status']) {
  const labels = {
    active: 'Ativa',
    completed: 'Concluída',
    archived: 'Arquivada',
  }
  return labels[status] ?? status
}

function toForm(goal: TherapyGoalRow): GoalForm {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description ?? '',
    target_date: goal.target_date?.slice(0, 10) ?? '',
    progress: String(goal.progress ?? 0),
    linked_schemas: (goal.linked_schemas ?? []).map((item) => item.name || item.code).filter(Boolean).join(', '),
  }
}

function parseLinkedSchemas(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({ code: name.toUpperCase().replace(/\s+/g, '_'), name }))
}

function clampProgress(value: string) {
  const number = Number(value)
  if (Number.isNaN(number)) return 0
  return Math.max(0, Math.min(100, Math.round(number)))
}

export function PatientGoalsManager({ data, onChanged }: {
  data: PatientDetailData
  onChanged: () => Promise<unknown>
}) {
  const [form, setForm] = useState<GoalForm | null>(null)
  const activeGoals = useMemo(() => data.goals.filter((goal) => goal.status !== 'archived'), [data.goals])
  const archivedGoals = data.goals.filter((goal) => goal.status === 'archived')
  const averageProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((sum, goal) => sum + (goal.progress ?? (goal.status === 'completed' ? 100 : 0)), 0) / activeGoals.length)
    : 0

  const saveMutation = useMutation({
    mutationFn: (input: GoalForm) => {
      const payload = {
        title: input.title,
        description: input.description,
        target_date: input.target_date,
        progress: clampProgress(input.progress),
        linked_schemas: parseLinkedSchemas(input.linked_schemas),
      }

      return input.id
        ? updateTherapyGoal({ id: input.id, ...payload })
        : createTherapyGoal({ clinic_id: data.patient.clinic_id, patient_id: data.patient.id, ...payload })
    },
    onSuccess: async () => {
      setForm(null)
      await onChanged()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TherapyGoalRow['status'] }) => setTherapyGoalStatus({ id, status }),
    onSuccess: async () => { await onChanged() },
  })

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form?.title.trim()) return
    saveMutation.mutate(form)
  }

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Prontuário operacional</span>
          <h2>Metas terapêuticas</h2>
          <p>CRUD clínico com progresso, conclusão e arquivamento preservando histórico.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setForm(emptyGoal)}>
          <Plus size={16} aria-hidden="true" /> Nova meta
        </Button>
      </div>

      <div className="goals-overview">
        <div>
          <strong>{activeGoals.length}</strong>
          <span>metas visíveis</span>
        </div>
        <div>
          <strong>{averageProgress}%</strong>
          <span>progresso médio</span>
        </div>
        <div>
          <strong>{archivedGoals.length}</strong>
          <span>arquivadas</span>
        </div>
      </div>

      {saveMutation.error || statusMutation.error ? (
        <div className="form-step-error">{((saveMutation.error ?? statusMutation.error) as Error).message}</div>
      ) : null}

      {activeGoals.length ? (
        <div className="goal-card-list">
          {activeGoals.map((goal) => {
            const progress = goal.progress ?? (goal.status === 'completed' ? 100 : 0)
            return (
              <section className="goal-card" key={goal.id}>
                <div className="goal-card-head">
                  <div>
                    <strong>{goal.title}</strong>
                    <span>{goal.description || 'Sem descrição'}</span>
                  </div>
                  <Badge tone={goalTone(goal.status)}>{goalLabel(goal.status)}</Badge>
                </div>
                <div className="goal-progress">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="goal-meta-row">
                  <span>{progress}% concluído</span>
                  <span>{goal.target_date ? `Alvo: ${formatDate(goal.target_date)}` : 'Sem data-alvo'}</span>
                  {goal.completed_at ? <span>Concluída em {formatDate(goal.completed_at)}</span> : null}
                </div>
                {(goal.linked_schemas ?? []).length ? (
                  <div className="context-progress-list">
                    {(goal.linked_schemas ?? []).map((schema) => <Badge key={`${goal.id}-${schema.code ?? schema.name}`} tone="neutral">{schema.name ?? schema.code}</Badge>)}
                  </div>
                ) : null}
                <div className="table-actions">
                  <Button variant="ghost" size="sm" onClick={() => setForm(toForm(goal))}><Edit3 size={15} aria-hidden="true" /> Editar</Button>
                  {goal.status === 'completed' ? (
                    <Button variant="secondary" size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: goal.id, status: 'active' })}><RotateCcw size={15} aria-hidden="true" /> Reabrir</Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: goal.id, status: 'completed' })}><CheckCircle2 size={15} aria-hidden="true" /> Concluir</Button>
                  )}
                  <Button variant="danger" size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: goal.id, status: 'archived' })}><Archive size={15} aria-hidden="true" /> Arquivar</Button>
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title="Nenhuma meta ativa"
          description="Crie metas terapêuticas para acompanhar progresso e direção do trabalho clínico."
        />
      )}

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card" onSubmit={submit} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>{form.id ? 'Editar meta' : 'Nova meta terapêutica'}</h2>
              <p>Defina objetivo, progresso e esquemas/modos relacionados.</p>
            </header>
            <label>Título<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={200} /></label>
            <label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="form-grid two">
              <label>Data-alvo<input type="date" value={form.target_date} onChange={(event) => setForm({ ...form, target_date: event.target.value })} /></label>
              <label>Progresso<input type="number" min="0" max="100" value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })} /></label>
              <label className="span-two">Esquemas ou modos relacionados<input value={form.linked_schemas} onChange={(event) => setForm({ ...form, linked_schemas: event.target.value })} placeholder="Ex.: Abandono, Crítico interno" /></label>
            </div>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar meta'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </article>
  )
}
