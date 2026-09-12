import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BrainCircuit, Edit3, ShieldCheck } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { getCaseConceptualization, saveCaseConceptualization } from '../../services/supabaseQueries'
import type { CaseConceptualizationData, PatientDetailData } from '../../types'

type ConceptualizationForm = {
  id?: string | null
  summary: string
  core_schemas: string
  modes: string
  coping_strategies: string
  emotional_needs: string
  triggers: string
  maintenance_cycles: string
  protective_factors: string
  therapy_focus: string
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

function toForm(id: string | null | undefined, data?: CaseConceptualizationData | null): ConceptualizationForm {
  return {
    id,
    summary: data?.summary ?? '',
    core_schemas: joinList(data?.core_schemas),
    modes: joinList(data?.modes),
    coping_strategies: joinList(data?.coping_strategies),
    emotional_needs: joinList(data?.emotional_needs),
    triggers: joinList(data?.triggers),
    maintenance_cycles: joinList(data?.maintenance_cycles),
    protective_factors: joinList(data?.protective_factors),
    therapy_focus: data?.therapy_focus ?? '',
  }
}

function toData(form: ConceptualizationForm): CaseConceptualizationData {
  return {
    summary: form.summary.trim() || null,
    core_schemas: listFromText(form.core_schemas),
    modes: listFromText(form.modes),
    coping_strategies: listFromText(form.coping_strategies),
    emotional_needs: listFromText(form.emotional_needs),
    triggers: listFromText(form.triggers),
    maintenance_cycles: listFromText(form.maintenance_cycles),
    protective_factors: listFromText(form.protective_factors),
    therapy_focus: form.therapy_focus.trim() || null,
  }
}

function SignalList({ title, items, tone = 'neutral' }: { title: string; items?: string[] | null; tone?: 'neutral' | 'info' | 'warning' | 'success' }) {
  return (
    <section>
      <strong>{title}</strong>
      {(items ?? []).length ? (
        <div className="context-progress-list">
          {(items ?? []).map((item) => <Badge key={`${title}-${item}`} tone={tone}>{item}</Badge>)}
        </div>
      ) : <p>Nada registrado.</p>}
    </section>
  )
}

export function PatientCaseConceptualizationManager({ data }: { data: PatientDetailData }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ConceptualizationForm | null>(null)
  const conceptualization = useQuery({
    queryKey: ['case-conceptualization', data.patient.id],
    queryFn: () => getCaseConceptualization(data.patient.id),
  })
  const clinicalData = conceptualization.data?.data ?? null
  const hasContent = Boolean(
    clinicalData?.summary ||
    clinicalData?.therapy_focus ||
    clinicalData?.core_schemas?.length ||
    clinicalData?.modes?.length ||
    clinicalData?.coping_strategies?.length,
  )

  const sourceHints = useMemo(() => {
    const hints = [
      data.problems.length ? `${data.problems.filter((problem) => problem.status === 'active').length} problemas ativos` : null,
      data.goals.length ? `${data.goals.filter((goal) => goal.status === 'active').length} metas ativas` : null,
      data.timelineEvents.length ? `${data.timelineEvents.length} eventos de timeline` : null,
      data.checkIns.length ? `${data.checkIns.length} check-ins` : null,
      data.patient.therapy_demands ? 'demandas iniciais preenchidas' : null,
    ].filter(Boolean)
    return hints as string[]
  }, [data])

  useEffect(() => {
    if (!form || form.id || !conceptualization.data) return
    setForm(toForm(conceptualization.data.id, conceptualization.data.data))
  }, [conceptualization.data, form])

  const mutation = useMutation({
    mutationFn: (input: ConceptualizationForm) => saveCaseConceptualization({
      id: input.id,
      patient_id: data.patient.id,
      data: toData(input),
    }),
    onSuccess: async () => {
      setForm(null)
      await queryClient.invalidateQueries({ queryKey: ['case-conceptualization', data.patient.id] })
    },
  })

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Módulos avançados</span>
          <h2>Conceitualização de caso</h2>
          <p>Formulação em Terapia de Esquemas: esquemas, modos, coping, necessidades e foco terapêutico.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setForm(toForm(conceptualization.data?.id, conceptualization.data?.data))}>
          <Edit3 size={16} aria-hidden="true" /> {hasContent ? 'Editar' : 'Criar'}
        </Button>
      </div>

      {conceptualization.error || mutation.error ? (
        <div className="form-step-error">{((conceptualization.error ?? mutation.error) as Error).message}</div>
      ) : null}

      {hasContent && clinicalData ? (
        <div className="conceptualization-board">
          <section className="conceptualization-core">
            <BrainCircuit size={24} aria-hidden="true" />
            <strong>Síntese clínica</strong>
            <p>{clinicalData.summary || 'Síntese ainda não preenchida.'}</p>
            {clinicalData.therapy_focus ? <span>{clinicalData.therapy_focus}</span> : null}
          </section>
          <SignalList title="Esquemas nucleares" items={clinicalData.core_schemas} tone="warning" />
          <SignalList title="Modos" items={clinicalData.modes} tone="info" />
          <SignalList title="Coping" items={clinicalData.coping_strategies} />
          <SignalList title="Necessidades emocionais" items={clinicalData.emotional_needs} tone="success" />
          <SignalList title="Gatilhos" items={clinicalData.triggers} tone="warning" />
          <SignalList title="Ciclos de manutenção" items={clinicalData.maintenance_cycles} />
          <SignalList title="Fatores protetivos" items={clinicalData.protective_factors} tone="success" />
        </div>
      ) : (
        <EmptyState
          icon={BrainCircuit}
          title="Conceitualização ainda vazia"
          description="Estruture a formulação do caso conectando avaliação inicial, problemas, timeline, genograma e metas."
        />
      )}

      <div className="conceptualization-source">
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          <strong>Fontes disponíveis para revisão</strong>
          <span>{sourceHints.length ? sourceHints.join(' · ') : 'Ainda há poucos dados clínicos estruturados para apoiar a formulação.'}</span>
        </div>
      </div>

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card wide-modal" onSubmit={(event) => { event.preventDefault(); mutation.mutate(form) }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>Conceitualização de caso</h2>
              <p>Use uma linha por item ou separe por vírgulas nos campos de lista.</p>
            </header>
            <label>Síntese clínica<textarea autoFocus value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
            <div className="form-grid two">
              <label>Esquemas nucleares<textarea value={form.core_schemas} onChange={(event) => setForm({ ...form, core_schemas: event.target.value })} placeholder="Abandono, desconfiança..." /></label>
              <label>Modos<textarea value={form.modes} onChange={(event) => setForm({ ...form, modes: event.target.value })} placeholder="Criança vulnerável, protetor desligado..." /></label>
              <label>Coping<textarea value={form.coping_strategies} onChange={(event) => setForm({ ...form, coping_strategies: event.target.value })} placeholder="Evitação, hipercompensação..." /></label>
              <label>Necessidades emocionais<textarea value={form.emotional_needs} onChange={(event) => setForm({ ...form, emotional_needs: event.target.value })} placeholder="Segurança, validação, autonomia..." /></label>
              <label>Gatilhos<textarea value={form.triggers} onChange={(event) => setForm({ ...form, triggers: event.target.value })} /></label>
              <label>Ciclos de manutenção<textarea value={form.maintenance_cycles} onChange={(event) => setForm({ ...form, maintenance_cycles: event.target.value })} /></label>
              <label className="span-two">Fatores protetivos<textarea value={form.protective_factors} onChange={(event) => setForm({ ...form, protective_factors: event.target.value })} /></label>
              <label className="span-two">Foco terapêutico<textarea value={form.therapy_focus} onChange={(event) => setForm({ ...form, therapy_focus: event.target.value })} /></label>
            </div>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando...' : 'Salvar conceitualização'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </article>
  )
}
