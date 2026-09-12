import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Archive, CheckCircle2, Edit3, Plus, RotateCcw } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { formatDate } from '../../lib/format'
import { createPatientProblem, setPatientProblemStatus, updatePatientProblem } from '../../services/supabaseQueries'
import type { PatientDetailData, PatientProblemRow } from '../../types'

type ProblemForm = {
  id?: string
  title: string
  description: string
  category: string
  intensity: string
  identified_at: string
}

const emptyProblem: ProblemForm = {
  title: '',
  description: '',
  category: '',
  intensity: '5',
  identified_at: new Date().toISOString().slice(0, 10),
}

function problemTone(status: PatientProblemRow['status']) {
  if (status === 'resolved') return 'success' as const
  if (status === 'archived') return 'neutral' as const
  return 'danger' as const
}

function problemLabel(status: PatientProblemRow['status']) {
  const labels = {
    active: 'Ativo',
    resolved: 'Resolvido',
    archived: 'Arquivado',
  }
  return labels[status] ?? status
}

function toForm(problem: PatientProblemRow): ProblemForm {
  return {
    id: problem.id,
    title: problem.title,
    description: problem.description ?? '',
    category: problem.category ?? '',
    intensity: String(problem.intensity ?? 5),
    identified_at: problem.identified_at?.slice(0, 10) ?? '',
  }
}

function clampIntensity(value: string) {
  const number = Number(value)
  if (Number.isNaN(number)) return null
  return Math.max(0, Math.min(10, Math.round(number)))
}

export function PatientProblemsManager({ data, onChanged }: {
  data: PatientDetailData
  onChanged: () => Promise<unknown>
}) {
  const [form, setForm] = useState<ProblemForm | null>(null)
  const visibleProblems = useMemo(() => data.problems.filter((problem) => problem.status !== 'archived'), [data.problems])
  const activeProblems = visibleProblems.filter((problem) => problem.status === 'active')
  const resolvedProblems = visibleProblems.filter((problem) => problem.status === 'resolved')
  const averageIntensity = activeProblems.length
    ? Math.round(activeProblems.reduce((sum, problem) => sum + (problem.intensity ?? 0), 0) / activeProblems.length)
    : 0

  const saveMutation = useMutation({
    mutationFn: (input: ProblemForm) => {
      const intensity = clampIntensity(input.intensity)
      const payload = {
        title: input.title,
        description: input.description,
        category: input.category,
        identified_at: input.identified_at,
        ...(intensity == null ? {} : { intensity }),
      }

      return input.id
        ? updatePatientProblem({ id: input.id, ...payload })
        : createPatientProblem({ clinic_id: data.patient.clinic_id, patient_id: data.patient.id, ...payload })
    },
    onSuccess: async () => {
      setForm(null)
      await onChanged()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PatientProblemRow['status'] }) => setPatientProblemStatus({ id, status }),
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
          <h2>Problemas clínicos</h2>
          <p>Registro longitudinal de demandas, categorias, intensidade e resolução.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setForm(emptyProblem)}>
          <Plus size={16} aria-hidden="true" /> Novo problema
        </Button>
      </div>

      <div className="goals-overview">
        <div>
          <strong>{activeProblems.length}</strong>
          <span>ativos</span>
        </div>
        <div>
          <strong>{averageIntensity}/10</strong>
          <span>intensidade média</span>
        </div>
        <div>
          <strong>{resolvedProblems.length}</strong>
          <span>resolvidos</span>
        </div>
      </div>

      {saveMutation.error || statusMutation.error ? (
        <div className="form-step-error">{((saveMutation.error ?? statusMutation.error) as Error).message}</div>
      ) : null}

      {visibleProblems.length ? (
        <div className="goal-card-list">
          {visibleProblems.map((problem) => {
            const intensity = problem.intensity ?? 0
            return (
              <section className="goal-card" key={problem.id}>
                <div className="goal-card-head">
                  <div>
                    <strong>{problem.title}</strong>
                    <span>{problem.description || 'Sem descrição'}</span>
                  </div>
                  <Badge tone={problemTone(problem.status)}>{problemLabel(problem.status)}</Badge>
                </div>
                <div className="goal-progress">
                  <span style={{ width: `${intensity * 10}%` }} />
                </div>
                <div className="goal-meta-row">
                  <span>Intensidade {intensity}/10</span>
                  <span>{problem.category || 'Sem categoria'}</span>
                  <span>{problem.identified_at ? `Identificado em ${formatDate(problem.identified_at)}` : 'Sem data de identificação'}</span>
                  {problem.resolved_at ? <span>Resolvido em {formatDate(problem.resolved_at)}</span> : null}
                </div>
                <div className="table-actions">
                  <Button variant="ghost" size="sm" onClick={() => setForm(toForm(problem))}><Edit3 size={15} aria-hidden="true" /> Editar</Button>
                  {problem.status === 'resolved' ? (
                    <Button variant="secondary" size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: problem.id, status: 'active' })}><RotateCcw size={15} aria-hidden="true" /> Reabrir</Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: problem.id, status: 'resolved' })}><CheckCircle2 size={15} aria-hidden="true" /> Resolver</Button>
                  )}
                  <Button variant="danger" size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: problem.id, status: 'archived' })}><Archive size={15} aria-hidden="true" /> Arquivar</Button>
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={AlertTriangle}
          title="Nenhum problema clínico registrado"
          description="Cadastre demandas clínicas relevantes para acompanhar intensidade, categoria e resolução."
        />
      )}

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card" onSubmit={submit} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>{form.id ? 'Editar problema' : 'Novo problema clínico'}</h2>
              <p>Registre uma demanda clínica de forma estruturada e acompanhável.</p>
            </header>
            <label>Título<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={200} /></label>
            <label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="form-grid two">
              <label>Categoria<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Ex.: Relacionamentos, trabalho, ansiedade" /></label>
              <label>Data identificada<input type="date" value={form.identified_at} onChange={(event) => setForm({ ...form, identified_at: event.target.value })} /></label>
              <label className="span-two">Intensidade
                <input type="range" min="0" max="10" value={form.intensity} onChange={(event) => setForm({ ...form, intensity: event.target.value })} />
                <span className="form-helper">Nível atual: {form.intensity}/10</span>
              </label>
            </div>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar problema'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </article>
  )
}
