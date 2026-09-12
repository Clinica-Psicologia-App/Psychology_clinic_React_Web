import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ClipboardCheck, Edit3 } from 'lucide-react'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { updatePatientInitialAssessment } from '../../services/supabaseQueries'
import type { PatientDetailData } from '../../types'

type AssessmentForm = {
  intake_summary: string
  current_life_context: string
  therapy_demands: string
}

function toForm(data: PatientDetailData): AssessmentForm {
  return {
    intake_summary: data.patient.intake_summary ?? '',
    current_life_context: data.patient.current_life_context ?? '',
    therapy_demands: data.patient.therapy_demands ?? '',
  }
}

function hasAssessment(data: PatientDetailData) {
  return Boolean(data.patient.intake_summary || data.patient.current_life_context || data.patient.therapy_demands)
}

export function PatientInitialAssessmentManager({ data, onChanged }: {
  data: PatientDetailData
  onChanged: () => Promise<unknown>
}) {
  const [form, setForm] = useState<AssessmentForm | null>(null)
  const assessmentReady = hasAssessment(data)

  const mutation = useMutation({
    mutationFn: (input: AssessmentForm) => updatePatientInitialAssessment({ patient_id: data.patient.id, ...input }),
    onSuccess: async () => {
      setForm(null)
      await onChanged()
    },
  })

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Avaliação inicial</span>
          <h2>Conhecendo o paciente</h2>
          <p>Resumo de intake, contexto atual e demandas terapêuticas para orientar a formulação do caso.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setForm(toForm(data))}>
          <Edit3 size={16} aria-hidden="true" /> {assessmentReady ? 'Editar' : 'Preencher'}
        </Button>
      </div>

      {assessmentReady ? (
        <div className="assessment-grid">
          <section>
            <strong>Resumo do intake</strong>
            <p>{data.patient.intake_summary || 'Não informado.'}</p>
          </section>
          <section>
            <strong>Contexto de vida atual</strong>
            <p>{data.patient.current_life_context || 'Não informado.'}</p>
          </section>
          <section>
            <strong>Demandas terapêuticas</strong>
            <p>{data.patient.therapy_demands || 'Não informado.'}</p>
          </section>
        </div>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="Avaliação inicial ainda não preenchida"
          description="Registre o contexto inicial para conectar problemas, metas, timeline e monitoramento."
        />
      )}

      {mutation.error ? <div className="form-step-error">{(mutation.error as Error).message}</div> : null}

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card" onSubmit={(event) => { event.preventDefault(); mutation.mutate(form) }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>Avaliação inicial</h2>
              <p>Use linguagem objetiva; estes campos alimentam a visão clínica agregada.</p>
            </header>
            <label>Resumo do intake<textarea autoFocus value={form.intake_summary} onChange={(event) => setForm({ ...form, intake_summary: event.target.value })} /></label>
            <label>Contexto de vida atual<textarea value={form.current_life_context} onChange={(event) => setForm({ ...form, current_life_context: event.target.value })} /></label>
            <label>Demandas terapêuticas<textarea value={form.therapy_demands} onChange={(event) => setForm({ ...form, therapy_demands: event.target.value })} /></label>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando...' : 'Salvar avaliação'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </article>
  )
}
