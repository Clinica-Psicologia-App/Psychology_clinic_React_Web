import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Film, Plus, Trash2 } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { formatDate } from '../../lib/format'
import { indicateLibraryWorkToPatient, listLibraryWorks, listPatientLibraryIndications, removeLibraryIndication } from '../../services/supabaseQueries'
import type { LibraryIndicationRow, PatientDetailData } from '../../types'

export function PatientLibraryManager({ data }: { data: PatientDetailData }) {
  const queryClient = useQueryClient()
  const [selectedWorkId, setSelectedWorkId] = useState('')

  const works = useQuery({ queryKey: ['library-works'], queryFn: listLibraryWorks })
  const indications = useQuery({
    queryKey: ['patient-library-indications', data.patient.id],
    queryFn: () => listPatientLibraryIndications(data.patient.id),
  })

  const indicatedWorkIds = useMemo(
    () => new Set((indications.data ?? []).map((indication) => indication.work_id)),
    [indications.data],
  )
  const availableWorks = (works.data ?? []).filter((work) => !indicatedWorkIds.has(work.id))

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['patient-library-indications', data.patient.id] }),
      queryClient.invalidateQueries({ queryKey: ['patient-portal-library'] }),
    ])
  }

  const indicateMutation = useMutation({
    mutationFn: (workId: string) => indicateLibraryWorkToPatient({ patient_id: data.patient.id, work_id: workId }),
    onSuccess: async () => {
      setSelectedWorkId('')
      await invalidate()
    },
  })

  const removeMutation = useMutation({
    mutationFn: removeLibraryIndication,
    onSuccess: invalidate,
  })

  function workLabel(indication: LibraryIndicationRow) {
    const work = indication.work
    if (!work) return 'Obra não localizada'
    return `${work.display_title}${work.year ? ` (${work.year})` : ''}`
  }

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Biblioteca terapêutica</span>
          <h2>Obras indicadas</h2>
          <p>Indique filmes, séries ou animações ao paciente mantendo a camada profissional protegida.</p>
        </div>
        <Film size={20} aria-hidden="true" />
      </div>

      {indicateMutation.error || removeMutation.error || works.error || indications.error ? (
        <div className="form-step-error">{((indicateMutation.error ?? removeMutation.error ?? works.error ?? indications.error) as Error).message}</div>
      ) : null}

      <div className="library-indication-form">
        <select value={selectedWorkId} onChange={(event) => setSelectedWorkId(event.target.value)} disabled={works.isLoading}>
          <option value="">Selecionar obra para indicar</option>
          {availableWorks.map((work) => <option key={work.id} value={work.id}>{work.display_title}</option>)}
        </select>
        <Button variant="primary" disabled={!selectedWorkId || indicateMutation.isPending} onClick={() => indicateMutation.mutate(selectedWorkId)}>
          <Plus size={16} aria-hidden="true" /> Indicar obra
        </Button>
      </div>

      {(indications.data ?? []).length ? (
        <div className="goal-card-list">
          {(indications.data ?? []).map((indication) => (
            <section className="goal-card" key={indication.id}>
              <div className="goal-card-head">
                <div>
                  <strong>{workLabel(indication)}</strong>
                  <span>{indication.work?.synopsis || 'Sem sinopse cadastrada.'}</span>
                </div>
                <Badge tone="info">{indication.work?.work_type ?? 'obra'}</Badge>
              </div>
              <div className="goal-meta-row">
                <span>Indicada em {formatDate(indication.created_at)}</span>
                {indication.work?.intensity != null ? <span>Intensidade {indication.work.intensity}/10</span> : null}
                {(indication.work?.genres ?? []).slice(0, 3).map((genre) => <span key={`${indication.id}-${genre}`}>{genre}</span>)}
              </div>
              <div className="table-actions">
                <Button variant="danger" size="sm" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(indication.id)}>
                  <Trash2 size={15} aria-hidden="true" /> Remover indicação
                </Button>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Film}
          title="Nenhuma obra indicada"
          description="Use o catálogo da biblioteca para selecionar obras úteis ao processo terapêutico deste paciente."
        />
      )}
    </article>
  )
}
