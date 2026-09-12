import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BrainCircuit, ClipboardCheck, Save } from 'lucide-react'
import { DataState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { getPatientPortalInitialAssessment, updateMyPatientInitialAssessment } from '../services/supabaseQueries'

type AssessmentForm = {
  intake_summary: string
  current_life_context: string
  therapy_demands: string
}

const emptyForm: AssessmentForm = {
  intake_summary: '',
  current_life_context: '',
  therapy_demands: '',
}

function completion(form: AssessmentForm) {
  const fields = [form.intake_summary, form.current_life_context, form.therapy_demands]
  return Math.round((fields.filter((field) => field.trim()).length / fields.length) * 100)
}

export function PatientInitialAssessmentPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<AssessmentForm>(emptyForm)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const assessment = useQuery({ queryKey: ['patient-initial-assessment'], queryFn: getPatientPortalInitialAssessment })

  useEffect(() => {
    if (!assessment.data) return
    setForm({
      intake_summary: assessment.data.intake_summary ?? '',
      current_life_context: assessment.data.current_life_context ?? '',
      therapy_demands: assessment.data.therapy_demands ?? '',
    })
  }, [assessment.data])

  const mutation = useMutation({
    mutationFn: updateMyPatientInitialAssessment,
    onSuccess: async () => {
      setMessage({ tone: 'success', text: 'Avaliação inicial salva com sucesso.' })
      await queryClient.invalidateQueries({ queryKey: ['patient-initial-assessment'] })
    },
    onError: (error) => setMessage({ tone: 'error', text: (error as Error).message }),
  })

  const progress = completion(form)

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Minha avaliação inicial"
        description="Compartilhe seu contexto inicial para ajudar seu psicólogo a compreender sua jornada."
        action={<Button variant="primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}><Save size={16} aria-hidden="true" /> {mutation.isPending ? 'Salvando...' : 'Salvar'}</Button>}
      />

      {message ? (
        <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 5000 : undefined} />
      ) : null}

      <DataState loading={assessment.isLoading} error={assessment.error} onRetry={() => assessment.refetch()}>
        <section className="stats-grid three">
          <StatCard label="Progresso" value={`${progress}%`} icon={ClipboardCheck} detail="3 blocos principais" />
          <StatCard label="Paciente" value={assessment.data?.full_name ?? '-'} icon={BrainCircuit} tone="blue" />
          <StatCard label="Status" value={progress === 100 ? 'Completa' : 'Em andamento'} icon={ClipboardCheck} tone={progress === 100 ? 'blue' : 'navy'} />
        </section>

        <article className="panel report-table-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Conhecendo você</span>
              <h2>Blocos iniciais</h2>
              <p>Você pode salvar agora e completar depois.</p>
            </div>
            <ClipboardCheck size={20} aria-hidden="true" />
          </div>

          <div className="assessment-form-grid">
            <label>
              O que te trouxe até a terapia?
              <textarea value={form.intake_summary} onChange={(event) => setForm({ ...form, intake_summary: event.target.value })} />
            </label>
            <label>
              Como está seu contexto de vida atual?
              <textarea value={form.current_life_context} onChange={(event) => setForm({ ...form, current_life_context: event.target.value })} />
            </label>
            <label>
              Quais demandas você gostaria de trabalhar?
              <textarea value={form.therapy_demands} onChange={(event) => setForm({ ...form, therapy_demands: event.target.value })} />
            </label>
          </div>
        </article>
      </DataState>
    </div>
  )
}
