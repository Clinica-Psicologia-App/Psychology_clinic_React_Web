import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Download, FileText, ShieldCheck, XCircle } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { generateClinicalReportPdf } from '../../services/supabaseQueries'
import type { ClinicalReportIncludeOptions, PatientDetailData } from '../../types'

const reportOptions: Array<{ key: keyof ClinicalReportIncludeOptions; label: string; description: string }> = [
  { key: 'questionnaires', label: 'Questionários', description: 'Resultados e instrumentos respondidos.' },
  { key: 'mental_map', label: 'Mapa mental', description: 'Síntese clínica agregada do caso.' },
  { key: 'goals', label: 'Metas', description: 'Plano terapêutico e progresso.' },
  { key: 'problems', label: 'Problemas', description: 'Demandas clínicas acompanhadas.' },
  { key: 'check_ins', label: 'Check-ins', description: 'Histórico de humor, ansiedade e energia.' },
  { key: 'daily_monitors', label: 'Monitores diários', description: 'Registros contínuos do paciente.' },
  { key: 'timeline', label: 'Linha do tempo', description: 'Eventos relevantes do acompanhamento.' },
  { key: 'genogram', label: 'Genograma', description: 'Pessoas e vínculos familiares.' },
]

const defaultInclude: ClinicalReportIncludeOptions = {
  questionnaires: true,
  mental_map: true,
  goals: true,
  problems: true,
  check_ins: true,
  daily_monitors: true,
  timeline: true,
  genogram: true,
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function PatientClinicalReportPanel({ data }: { data: PatientDetailData }) {
  const [include, setInclude] = useState<ClinicalReportIncludeOptions>(defaultInclude)
  const selectedCount = useMemo(() => Object.values(include).filter(Boolean).length, [include])
  const reportMutation = useMutation({
    mutationFn: () => generateClinicalReportPdf({
      patient_id: data.patient.id,
      patient_name: data.patient.full_name,
      include,
    }),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename)
    },
  })

  function setAll(value: boolean) {
    setInclude(Object.fromEntries(reportOptions.map((option) => [option.key, value])) as ClinicalReportIncludeOptions)
  }

  return (
    <article className="panel report-table-panel clinical-report-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Documento clínico</span>
          <h2>Relatório PDF</h2>
          <p>Gere um relatório clínico pela Edge Function oficial, escolhendo quais seções entram no documento.</p>
        </div>
        <div className="table-actions">
          <Button variant="ghost" size="sm" onClick={() => setAll(true)}><CheckCircle2 size={16} aria-hidden="true" /> Marcar tudo</Button>
          <Button variant="ghost" size="sm" onClick={() => setAll(false)}><XCircle size={16} aria-hidden="true" /> Limpar</Button>
          <Button variant="primary" size="sm" disabled={!selectedCount || reportMutation.isPending} onClick={() => reportMutation.mutate()}>
            <Download size={16} aria-hidden="true" /> {reportMutation.isPending ? 'Gerando...' : 'Baixar PDF'}
          </Button>
        </div>
      </div>

      {reportMutation.error ? (
        <div className="form-step-error">{(reportMutation.error as Error).message}</div>
      ) : null}

      <div className="clinical-report-summary">
        <FileText size={24} aria-hidden="true" />
        <div>
          <strong>{selectedCount} de {reportOptions.length} seções selecionadas</strong>
          <span>O arquivo é gerado pelo backend, respeitando a sessão atual, permissões clínicas e regras de privacidade.</span>
        </div>
        <Badge tone={selectedCount ? 'success' : 'neutral'}>{selectedCount ? 'Pronto para gerar' : 'Selecione seções'}</Badge>
      </div>

      <div className="clinical-report-options">
        {reportOptions.map((option) => (
          <label key={option.key} className={include[option.key] ? 'selected' : undefined}>
            <input
              type="checkbox"
              checked={include[option.key]}
              onChange={(event) => setInclude({ ...include, [option.key]: event.target.checked })}
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
            {include[option.key] ? <ShieldCheck size={16} aria-hidden="true" /> : null}
          </label>
        ))}
      </div>
    </article>
  )
}
