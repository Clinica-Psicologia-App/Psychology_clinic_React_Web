import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, Edit3, Plus, Share2, Trash2 } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { formatDate } from '../../lib/format'
import { deletePersonalityAssessment, listPersonalityAssessments, savePersonalityAssessment, setPersonalityAssessmentShared } from '../../services/supabaseQueries'
import type { PatientDetailData, PersonalityAssessmentRow, PersonalityDomainScore } from '../../types'

type PersonalityForm = {
  id?: string | null
  instrument: string
  applied_on: string
  application_form: string
  protocol_validity: string
  shared_with_patient: boolean
  domains: PersonalityDomainScore[]
  results_summary: string
  synthesis_summary: string
  strengths: string
  vulnerabilities: string
  clinical_hypotheses: string
  patient_summary: string
  schema_links: string
  mode_links: string
  therapy_implications: string
}

const emptyDomain: PersonalityDomainScore = { domain: '', score: null, classification: '', note: '' }

const emptyPersonality: PersonalityForm = {
  instrument: 'NEO-PI-R',
  applied_on: '',
  application_form: '',
  protocol_validity: '',
  shared_with_patient: false,
  domains: [{ ...emptyDomain }],
  results_summary: '',
  synthesis_summary: '',
  strengths: '',
  vulnerabilities: '',
  clinical_hypotheses: '',
  patient_summary: '',
  schema_links: '',
  mode_links: '',
  therapy_implications: '',
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

function numberOrNull(value: unknown) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function toForm(assessment: PersonalityAssessmentRow): PersonalityForm {
  return {
    id: assessment.id,
    instrument: assessment.instrument,
    applied_on: assessment.applied_on?.slice(0, 10) ?? '',
    application_form: assessment.application_form ?? '',
    protocol_validity: assessment.protocol_validity ?? '',
    shared_with_patient: Boolean(assessment.shared_with_patient),
    domains: assessment.results?.domains?.length ? assessment.results.domains.map((domain) => ({ ...emptyDomain, ...domain })) : [{ ...emptyDomain }],
    results_summary: assessment.results?.summary ?? '',
    synthesis_summary: assessment.clinical_synthesis?.summary ?? '',
    strengths: joinList(assessment.clinical_synthesis?.strengths),
    vulnerabilities: joinList(assessment.clinical_synthesis?.vulnerabilities),
    clinical_hypotheses: joinList(assessment.clinical_synthesis?.clinical_hypotheses),
    patient_summary: assessment.clinical_synthesis?.patient_summary ?? '',
    schema_links: joinList(assessment.conceptualization_integration?.schema_links),
    mode_links: joinList(assessment.conceptualization_integration?.mode_links),
    therapy_implications: assessment.conceptualization_integration?.therapy_implications ?? '',
  }
}

function toPayload(patientId: string, form: PersonalityForm) {
  return {
    id: form.id,
    patient_id: patientId,
    instrument: form.instrument,
    applied_on: form.applied_on,
    application_form: form.application_form,
    protocol_validity: form.protocol_validity,
    shared_with_patient: form.shared_with_patient,
    results: {
      summary: form.results_summary.trim() || null,
      domains: form.domains
        .map((domain) => ({
          domain: domain.domain.trim(),
          score: numberOrNull(domain.score),
          classification: domain.classification?.trim() || null,
          note: domain.note?.trim() || null,
        }))
        .filter((domain) => domain.domain),
    },
    clinical_synthesis: {
      summary: form.synthesis_summary.trim() || null,
      strengths: listFromText(form.strengths),
      vulnerabilities: listFromText(form.vulnerabilities),
      clinical_hypotheses: listFromText(form.clinical_hypotheses),
      patient_summary: form.patient_summary.trim() || null,
    },
    conceptualization_integration: {
      schema_links: listFromText(form.schema_links),
      mode_links: listFromText(form.mode_links),
      therapy_implications: form.therapy_implications.trim() || null,
    },
  }
}

export function PatientPersonalityManager({ data }: { data: PatientDetailData }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<PersonalityForm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PersonalityAssessmentRow | null>(null)
  const assessments = useQuery({
    queryKey: ['personality-assessments', data.patient.id],
    queryFn: () => listPersonalityAssessments(data.patient.id),
  })

  const latest = assessments.data?.[0] ?? null
  const domainCount = useMemo(() => (assessments.data ?? []).reduce((sum, item) => sum + (item.results?.domains?.length ?? 0), 0), [assessments.data])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['personality-assessments', data.patient.id] })
    await queryClient.invalidateQueries({ queryKey: ['patient-portal-personality'] })
  }

  const saveMutation = useMutation({
    mutationFn: (input: PersonalityForm) => savePersonalityAssessment(toPayload(data.patient.id, input)),
    onSuccess: async () => {
      setForm(null)
      await invalidate()
    },
  })

  const shareMutation = useMutation({
    mutationFn: setPersonalityAssessmentShared,
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deletePersonalityAssessment,
    onSuccess: async () => {
      setDeleteTarget(null)
      await invalidate()
    },
  })

  function updateDomain(index: number, patch: Partial<PersonalityDomainScore>) {
    if (!form) return
    setForm({ ...form, domains: form.domains.map((domain, domainIndex) => domainIndex === index ? { ...domain, ...patch } : domain) })
  }

  function removeDomain(index: number) {
    if (!form) return
    setForm({ ...form, domains: form.domains.filter((_, domainIndex) => domainIndex !== index) })
  }

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Módulos avançados</span>
          <h2>Personalidade</h2>
          <p>Avaliações, síntese clínica, integração à conceitualização e compartilhamento com paciente.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setForm(emptyPersonality)}><Plus size={16} aria-hidden="true" /> Nova avaliação</Button>
      </div>

      {assessments.error || saveMutation.error || shareMutation.error || deleteMutation.error ? (
        <div className="form-step-error">{((assessments.error ?? saveMutation.error ?? shareMutation.error ?? deleteMutation.error) as Error).message}</div>
      ) : null}

      {(assessments.data ?? []).length ? (
        <div className="personality-layout">
          <section className="personality-highlight">
            <Brain size={24} aria-hidden="true" />
            <strong>{latest?.instrument ?? 'Avaliação'}</strong>
            <span>{latest?.applied_on ? `Aplicada em ${formatDate(latest.applied_on)}` : 'Sem data de aplicação'}</span>
            <div className="context-progress-list">
              <Badge tone={latest?.shared_with_patient ? 'success' : 'neutral'}>{latest?.shared_with_patient ? 'Compartilhada' : 'Privada'}</Badge>
              <Badge tone="info">{domainCount} domínios</Badge>
            </div>
          </section>

          <section className="goal-card-list">
            {(assessments.data ?? []).map((assessment) => (
              <article className="goal-card" key={assessment.id}>
                <div className="goal-card-head">
                  <div>
                    <strong>{assessment.instrument}</strong>
                    <span>{assessment.results?.summary || assessment.clinical_synthesis?.patient_summary || 'Sem resumo cadastrado.'}</span>
                  </div>
                  <Badge tone={assessment.shared_with_patient ? 'success' : 'neutral'}>{assessment.shared_with_patient ? 'Compartilhada' : 'Privada'}</Badge>
                </div>
                <div className="personality-domain-grid">
                  {(assessment.results?.domains ?? []).slice(0, 6).map((domain) => (
                    <div key={`${assessment.id}-${domain.domain}`}>
                      <span>{domain.domain}</span>
                      <strong>{domain.score ?? '-'}</strong>
                      <small>{domain.classification ?? 'Sem classificação'}</small>
                    </div>
                  ))}
                </div>
                <div className="table-actions">
                  <Button variant="ghost" size="sm" onClick={() => setForm(toForm(assessment))}><Edit3 size={15} aria-hidden="true" /> Editar</Button>
                  <Button variant="secondary" size="sm" disabled={shareMutation.isPending} onClick={() => shareMutation.mutate({ id: assessment.id, shared_with_patient: !assessment.shared_with_patient })}>
                    <Share2 size={15} aria-hidden="true" /> {assessment.shared_with_patient ? 'Ocultar do paciente' : 'Compartilhar'}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(assessment)}><Trash2 size={15} aria-hidden="true" /> Excluir</Button>
                </div>
              </article>
            ))}
          </section>
        </div>
      ) : (
        <EmptyState icon={Brain} title="Nenhuma avaliação de personalidade" description="Registre domínios, síntese clínica e versão compartilhável para o paciente." />
      )}

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card wide-modal" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(form) }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>{form.id ? 'Editar avaliação' : 'Nova avaliação de personalidade'}</h2>
              <p>Use a síntese clínica para equipe e o resumo do paciente para compartilhamento seguro.</p>
            </header>
            <div className="form-grid two">
              <label>Instrumento<input autoFocus value={form.instrument} onChange={(event) => setForm({ ...form, instrument: event.target.value })} required /></label>
              <label>Aplicado em<input type="date" value={form.applied_on} onChange={(event) => setForm({ ...form, applied_on: event.target.value })} /></label>
              <label>Forma de aplicação<input value={form.application_form} onChange={(event) => setForm({ ...form, application_form: event.target.value })} /></label>
              <label>Validade do protocolo<input value={form.protocol_validity} onChange={(event) => setForm({ ...form, protocol_validity: event.target.value })} /></label>
              <label className="check-row span-two"><input type="checkbox" checked={form.shared_with_patient} onChange={(event) => setForm({ ...form, shared_with_patient: event.target.checked })} /> Compartilhar versão do paciente</label>
              <label className="span-two">Resumo dos resultados<textarea value={form.results_summary} onChange={(event) => setForm({ ...form, results_summary: event.target.value })} /></label>
            </div>

            <div className="psycho-card-editor">
              <div className="panel-header">
                <div><h3>Domínios</h3><p>Registre os principais domínios e classificações.</p></div>
                <Button variant="secondary" size="sm" onClick={() => setForm({ ...form, domains: [...form.domains, { ...emptyDomain }] })}><Plus size={15} aria-hidden="true" /> Domínio</Button>
              </div>
              {form.domains.map((domain, index) => (
                <section key={index}>
                  <div className="form-grid two">
                    <label>Domínio<input value={domain.domain} onChange={(event) => updateDomain(index, { domain: event.target.value })} /></label>
                    <label>Pontuação<input type="number" value={domain.score ?? ''} onChange={(event) => updateDomain(index, { score: numberOrNull(event.target.value) })} /></label>
                    <label>Classificação<input value={domain.classification ?? ''} onChange={(event) => updateDomain(index, { classification: event.target.value })} /></label>
                    <label>Nota<input value={domain.note ?? ''} onChange={(event) => updateDomain(index, { note: event.target.value })} /></label>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeDomain(index)}>Remover domínio</Button>
                </section>
              ))}
            </div>

            <div className="library-layer-grid">
              <section>
                <h3>Síntese clínica</h3>
                <label>Síntese privada<textarea value={form.synthesis_summary} onChange={(event) => setForm({ ...form, synthesis_summary: event.target.value })} /></label>
                <label>Forças<textarea value={form.strengths} onChange={(event) => setForm({ ...form, strengths: event.target.value })} /></label>
                <label>Vulnerabilidades<textarea value={form.vulnerabilities} onChange={(event) => setForm({ ...form, vulnerabilities: event.target.value })} /></label>
                <label>Hipóteses clínicas<textarea value={form.clinical_hypotheses} onChange={(event) => setForm({ ...form, clinical_hypotheses: event.target.value })} /></label>
              </section>
              <section>
                <h3>Compartilhamento e integração</h3>
                <label>Resumo para paciente<textarea value={form.patient_summary} onChange={(event) => setForm({ ...form, patient_summary: event.target.value })} /></label>
                <label>Esquemas relacionados<textarea value={form.schema_links} onChange={(event) => setForm({ ...form, schema_links: event.target.value })} /></label>
                <label>Modos relacionados<textarea value={form.mode_links} onChange={(event) => setForm({ ...form, mode_links: event.target.value })} /></label>
                <label>Implicações terapêuticas<textarea value={form.therapy_implications} onChange={(event) => setForm({ ...form, therapy_implications: event.target.value })} /></label>
              </section>
            </div>

            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar avaliação'}</Button>
            </footer>
          </form>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDeleteTarget(null)}>
          <section className="modal-card confirm-dialog" onClick={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true">
            <header><h2>Excluir avaliação</h2><p>Remover avaliação {deleteTarget.instrument}?</p></header>
            <footer>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
              <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>Excluir</Button>
            </footer>
          </section>
        </div>
      ) : null}
    </article>
  )
}
