import { useQuery } from '@tanstack/react-query'
import { Lightbulb, RefreshCw } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import { listClinicalHypotheses } from '../../services/supabaseQueries'
import type { PatientDetailData } from '../../types'

const KIND_LABELS: Record<string, string> = {
  emotional_need: 'Necessidade emocional',
  schema: 'Esquema',
  mode: 'Modo',
  coping_style: 'Estilo de coping',
  current_problem: 'Problema atual',
  clinical_note: 'Nota clínica',
}

const KIND_TONES: Record<string, 'neutral' | 'info' | 'clinical' | 'warning' | 'danger' | 'success'> = {
  emotional_need: 'clinical',
  schema: 'danger',
  mode: 'warning',
  coping_style: 'info',
  current_problem: 'neutral',
  clinical_note: 'neutral',
}

export function PatientClinicalHypothesesPanel({ data }: { data: PatientDetailData }) {
  const hypotheses = useQuery({
    queryKey: ['clinical-hypotheses', data.patient.id],
    queryFn: () => listClinicalHypotheses(data.patient.id),
  })

  const list = hypotheses.data ?? []

  const grouped = list.reduce<Record<string, string[]>>((acc, h) => {
    if (!acc[h.kind]) acc[h.kind] = []
    acc[h.kind]!.push(h.body)
    return acc
  }, {})

  const kinds = Object.keys(grouped).sort((a, b) => {
    const order = ['emotional_need', 'schema', 'mode', 'coping_style', 'current_problem', 'clinical_note']
    return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99)
  })

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Formulação</span>
          <h2>Hipóteses clínicas</h2>
          <p>Hipóteses formuladas pelo terapeuta sobre esquemas, modos e necessidades do paciente.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
          <RefreshCw size={13} /> Registrado no aplicativo
        </div>
      </div>

      {!list.length && !hypotheses.isLoading ? (
        <EmptyState
          icon={Lightbulb}
          title="Nenhuma hipótese registrada"
          description="As hipóteses clínicas aparecerão aqui assim que forem registradas no aplicativo."
        />
      ) : (
        <div className="assessment-blocks">
          {kinds.map((kind) => (
            <section key={kind} className="assessment-block">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Badge tone={KIND_TONES[kind] ?? 'neutral'}>{KIND_LABELS[kind] ?? kind}</Badge>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {grouped[kind]!.map((body, i) => (
                  <p key={i} className="assessment-field" style={{ margin: 0 }}>{body}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  )
}
