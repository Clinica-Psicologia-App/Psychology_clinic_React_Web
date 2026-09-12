import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, ClipboardList, Layers3, Play, RotateCcw } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { formatDate } from '../lib/format'
import {
  finishPatientQuestionnaire,
  getQuestionnaireSession,
  listPatientPortalQuestionnaires,
  startPatientQuestionnaire,
  submitPatientQuestionnaireAnswer,
} from '../services/supabaseQueries'
import type { PatientPortalQuestionnaireAssignment, QuestionnaireSessionData } from '../types'

const parentalCode = 'PARENTAL_STYLES_V1'
const defaultContexts = [
  { key: 'mother', label: 'Mãe' },
  { key: 'father', label: 'Pai' },
]

function statusLabel(status?: string | null) {
  if (status === 'completed') return 'Concluído'
  if (status === 'draft') return 'Em andamento'
  return 'Pendente'
}

function statusTone(status?: string | null) {
  if (status === 'completed') return 'success' as const
  if (status === 'draft') return 'warning' as const
  return 'neutral' as const
}

function answerKey(questionId: string, contextId?: string | null) {
  return contextId ? `${contextId}:${questionId}` : questionId
}

function clampScale(question: QuestionnaireSessionData['questions'][number]) {
  const min = question.scale_min ?? 1
  const max = question.scale_max ?? 5
  return { min, max }
}

function QuestionnaireRunner({ session, onClose, onFinished }: {
  session: QuestionnaireSessionData
  onClose: () => void
  onFinished: () => Promise<unknown>
}) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [contextIndex, setContextIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>(() => Object.fromEntries(
    session.answers.map((answer) => [answerKey(answer.question_id, answer.response_context_id), answer.answer_value]),
  ))
  const [error, setError] = useState('')
  const hasContexts = session.contexts.length > 0
  const question = session.questions[questionIndex]
  const context = hasContexts ? session.contexts[contextIndex] : null
  const key = question ? answerKey(question.id, context?.id) : ''
  const selected = answers[key]
  const isLastQuestion = questionIndex === session.questions.length - 1
  const isLastContext = !hasContexts || contextIndex === session.contexts.length - 1
  const isLast = isLastQuestion && isLastContext
  const totalSteps = session.questions.length * Math.max(1, session.contexts.length)
  const currentStep = contextIndex * session.questions.length + questionIndex + 1
  const progress = totalSteps ? Math.round((currentStep / totalSteps) * 100) : 0

  const submitMutation = useMutation({
    mutationFn: () => submitPatientQuestionnaireAnswer({
      response_id: session.response_id,
      question_id: question.id,
      answer_value: selected,
      response_context_id: context?.id,
    }),
  })

  const finishMutation = useMutation({
    mutationFn: () => finishPatientQuestionnaire(session.response_id),
    onSuccess: async () => {
      await onFinished()
    },
  })

  async function saveCurrent() {
    if (!question) return false
    if (selected == null) {
      setError('Selecione uma resposta para continuar.')
      return false
    }

    setError('')
    await submitMutation.mutateAsync()
    return true
  }

  async function next() {
    const saved = await saveCurrent()
    if (!saved) return

    if (isLast) {
      await finishMutation.mutateAsync()
      return
    }

    if (isLastQuestion && hasContexts) {
      setContextIndex((value) => value + 1)
      setQuestionIndex(0)
      return
    }

    setQuestionIndex((value) => value + 1)
  }

  function previous() {
    setError('')
    if (questionIndex > 0) {
      setQuestionIndex((value) => value - 1)
      return
    }
    if (hasContexts && contextIndex > 0) {
      setContextIndex((value) => value - 1)
      setQuestionIndex(session.questions.length - 1)
    }
  }

  if (!question) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Questionário sem perguntas"
        description="Este instrumento não possui perguntas ativas para responder."
        action={<Button variant="secondary" onClick={onClose}>Voltar</Button>}
      />
    )
  }

  const { min, max } = clampScale(question)
  const options = Array.from({ length: Math.max(0, max - min + 1) }).map((_, index) => min + index)
  const pending = submitMutation.isPending || finishMutation.isPending

  return (
    <section className="questionnaire-runner panel">
      <header className="questionnaire-runner-header">
        <div>
          <span className="eyebrow">Respondendo questionário</span>
          <h2>{session.questionnaire_name}</h2>
          <p>{hasContexts ? `Figura atual: ${context?.context_label}` : `Pergunta ${question.code}`}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Sair</Button>
      </header>

      <div className="questionnaire-progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="questionnaire-progress-label">
        <strong>{currentStep}/{totalSteps}</strong>
        <span>{progress}% concluído</span>
      </div>

      {hasContexts ? (
        <div className="context-progress-list">
          {session.contexts.map((item, index) => (
            <Badge key={item.id} tone={index === contextIndex ? 'info' : index < contextIndex ? 'success' : 'neutral'}>
              {item.context_label}
            </Badge>
          ))}
        </div>
      ) : null}

      <article className="question-card">
        <span>{question.code}</span>
        <h3>{question.text}</h3>
        <div className="answer-choice-grid" role="radiogroup" aria-label="Resposta">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={selected === option ? 'selected' : ''}
              onClick={() => {
                setAnswers((current) => ({ ...current, [key]: option }))
                setError('')
              }}
              aria-pressed={selected === option}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="scale-caption">
          <span>Mínimo: {min}</span>
          <span>Máximo: {max}</span>
        </div>
      </article>

      {error || submitMutation.error || finishMutation.error ? (
        <div className="form-step-error">
          {error || ((submitMutation.error ?? finishMutation.error) as Error).message}
        </div>
      ) : null}

      <footer className="questionnaire-runner-actions">
        <Button variant="ghost" onClick={previous} disabled={pending || (questionIndex === 0 && contextIndex === 0)}>
          <ArrowLeft size={16} aria-hidden="true" /> Anterior
        </Button>
        <Button variant="primary" onClick={next} disabled={pending}>
          {pending ? 'Salvando...' : isLast ? <><Check size={16} aria-hidden="true" /> Finalizar</> : <>Próxima <ArrowRight size={16} aria-hidden="true" /></>}
        </Button>
      </footer>
    </section>
  )
}

export function PatientQuestionnairesPage() {
  const queryClient = useQueryClient()
  const [activeSession, setActiveSession] = useState<QuestionnaireSessionData | null>(null)
  const [contextTarget, setContextTarget] = useState<PatientPortalQuestionnaireAssignment | null>(null)
  const [selectedContexts, setSelectedContexts] = useState(defaultContexts.map((item) => item.key))
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const list = useQuery({ queryKey: ['patient-portal-questionnaires'], queryFn: listPatientPortalQuestionnaires })

  const totals = useMemo(() => {
    const rows = list.data ?? []
    return {
      total: rows.length,
      pending: rows.filter((item) => !item.response_status).length,
      draft: rows.filter((item) => item.response_status === 'draft').length,
      completed: rows.filter((item) => item.response_status === 'completed').length,
    }
  }, [list.data])

  const startMutation = useMutation({
    mutationFn: (input: { assignment: PatientPortalQuestionnaireAssignment; contexts?: Array<{ key: string; label: string }> }) => startPatientQuestionnaire({
      assignment_id: input.assignment.id,
      patient_id: input.assignment.patient_id,
      questionnaire_id: input.assignment.questionnaire_id,
      contexts: input.contexts,
    }),
    onSuccess: (session) => {
      setContextTarget(null)
      setActiveSession(session)
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const resumeMutation = useMutation({
    mutationFn: getQuestionnaireSession,
    onSuccess: (session) => setActiveSession(session),
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  async function refreshAfterFinish() {
    setActiveSession(null)
    setMessage({ tone: 'success', text: 'Questionário finalizado com sucesso. Seu psicólogo poderá revisar os resultados.' })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['patient-portal-questionnaires'] }),
      queryClient.invalidateQueries({ queryKey: ['patient-portal-results'] }),
    ])
  }

  function handleStart(assignment: PatientPortalQuestionnaireAssignment) {
    if (assignment.response_status === 'completed') return
    if (assignment.response_status === 'draft' && assignment.response_id) {
      resumeMutation.mutate(assignment.response_id)
      return
    }
    if (assignment.questionnaire_code.toUpperCase() === parentalCode) {
      setSelectedContexts(defaultContexts.map((item) => item.key))
      setContextTarget(assignment)
      return
    }
    startMutation.mutate({ assignment })
  }

  if (activeSession) {
    return (
      <QuestionnaireRunner
        session={activeSession}
        onClose={() => setActiveSession(null)}
        onFinished={refreshAfterFinish}
      />
    )
  }

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Meus questionários"
        description="Instrumentos liberados pelo seu psicólogo para acompanhar seu processo."
      />

      {message ? (
        <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 5000 : undefined} />
      ) : null}

      <DataState loading={list.isLoading} error={list.error} onRetry={() => list.refetch()}>
        <section className="stats-grid four">
          <StatCard label="Liberados" value={totals.total} icon={ClipboardList} />
          <StatCard label="Pendentes" value={totals.pending} icon={Play} tone="warning" />
          <StatCard label="Em andamento" value={totals.draft} icon={RotateCcw} tone="blue" />
          <StatCard label="Concluídos" value={totals.completed} icon={Check} tone="navy" />
        </section>

        {(list.data ?? []).length ? (
          <section className="card-grid questionnaires-grid">
            {(list.data ?? []).map((assignment) => {
              const pending = startMutation.isPending || resumeMutation.isPending
              const completed = assignment.response_status === 'completed'
              return (
                <article className="metric-card questionnaire-portal-card" key={assignment.id}>
                  <div className="metric-icon"><ClipboardList size={20} aria-hidden="true" /></div>
                  <div>
                    <div className="card-title-row">
                      <h3>{assignment.questionnaire_name}</h3>
                      <Badge tone={statusTone(assignment.response_status)}>{statusLabel(assignment.response_status)}</Badge>
                    </div>
                    <p>{assignment.questionnaire_description ?? assignment.message ?? 'Questionário liberado para acompanhamento clínico.'}</p>
                    <div className="card-meta-row">
                      <span>{assignment.questionnaire_code}</span>
                      <span>Liberado em {formatDate(assignment.assigned_at)}</span>
                      {assignment.response_completed_at ? <span>Concluído em {formatDate(assignment.response_completed_at)}</span> : null}
                    </div>
                  </div>
                  <Button variant={completed ? 'ghost' : 'primary'} disabled={completed || pending} onClick={() => handleStart(assignment)}>
                    {assignment.response_status === 'draft' ? <><RotateCcw size={16} aria-hidden="true" /> Continuar</> : completed ? 'Concluído' : <><Play size={16} aria-hidden="true" /> Responder</>}
                  </Button>
                </article>
              )
            })}
          </section>
        ) : (
          <EmptyState
            icon={Layers3}
            title="Nenhum questionário liberado"
            description="Quando seu psicólogo liberar um instrumento, ele aparecerá aqui."
          />
        )}
      </DataState>

      {contextTarget ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setContextTarget(null)}>
          <form
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              const contexts = defaultContexts.filter((item) => selectedContexts.includes(item.key))
              if (!contexts.length) {
                setMessage({ tone: 'warning', text: 'Selecione ao menos uma figura parental para responder.' })
                return
              }
              startMutation.mutate({ assignment: contextTarget, contexts })
            }}
          >
            <header>
              <h2>Figuras parentais</h2>
              <p>Este instrumento repete as perguntas para cada figura selecionada.</p>
            </header>
            <div className="context-selector-list">
              {defaultContexts.map((item) => (
                <label className="check-row" key={item.key}>
                  <input
                    type="checkbox"
                    checked={selectedContexts.includes(item.key)}
                    onChange={(event) => setSelectedContexts((current) => event.target.checked ? [...current, item.key] : current.filter((key) => key !== item.key))}
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setContextTarget(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={startMutation.isPending}>{startMutation.isPending ? 'Iniciando...' : 'Iniciar questionário'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}
