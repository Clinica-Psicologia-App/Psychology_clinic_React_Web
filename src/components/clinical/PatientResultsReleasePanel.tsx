import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { ConfirmDialog } from '../design-system/ConfirmDialog'
import { useAuth } from '../../context/auth'
import { formatDate } from '../../lib/format'
import { setPatientResultsReleased } from '../../services/supabaseQueries'
import type { PatientDetailData } from '../../types'

export function PatientResultsReleasePanel({ data, onChanged }: {
  data: PatientDetailData
  onChanged: () => Promise<unknown>
}) {
  const { profile } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const released = Boolean(data.patient.results_released_at)
  const completedResponses = data.responses.filter((response) => response.status === 'completed').length
  const canManage = Boolean(profile?.role === 'psychologist' && profile.id === data.patient.responsible_psychologist_id)
  const confirmCopy = useMemo(() => {
    if (released) {
      return {
        title: 'Revogar resultados do paciente?',
        description: 'O paciente deixará de visualizar resultados clínicos já concluídos. A equipe da clínica continuará com acesso conforme permissões do banco.',
        label: 'Revogar resultados',
        tone: 'danger' as const,
      }
    }

    return {
      title: 'Liberar resultados para o paciente?',
      description: 'Todos os resultados clínicos concluídos ficarão visíveis ao paciente. Use somente após revisão clínica.',
      label: 'Liberar resultados',
      tone: 'primary' as const,
    }
  }, [released])

  const mutation = useMutation({
    mutationFn: () => setPatientResultsReleased({ patient_id: data.patient.id, released: !released }),
    onSuccess: async () => {
      setConfirmOpen(false)
      await onChanged()
    },
  })

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Resultados do paciente</span>
          <h2>Liberação clínica</h2>
          <p>O paciente só visualiza resultados quando a liberação global está ativa.</p>
        </div>
        <ShieldCheck size={20} aria-hidden="true" />
      </div>

      <div className="state-panel">
        {released ? <Eye size={20} aria-hidden="true" /> : <EyeOff size={20} aria-hidden="true" />}
        <div>
          <strong>{released ? 'Resultados visíveis ao paciente' : 'Resultados bloqueados para o paciente'}</strong>
          <p>
            {released
              ? `Liberado em ${formatDate(data.patient.results_released_at)}.`
              : `${completedResponses} resposta(s) concluída(s) aguardam decisão clínica.`}
          </p>
        </div>
        <Badge tone={released ? 'success' : 'warning'}>{released ? 'Liberado' : 'Restrito'}</Badge>
      </div>

      {!canManage ? (
        <div className="state-panel">
          <LockKeyhole size={20} aria-hidden="true" />
          <div>
            <strong>Ação restrita ao psicólogo responsável</strong>
            <p>A RPC oficial permite liberar ou revogar resultados apenas pelo psicólogo responsável do paciente.</p>
          </div>
        </div>
      ) : null}

      {mutation.error ? <div className="form-step-error">{(mutation.error as Error).message}</div> : null}

      <div className="panel-actions">
        <Button
          variant={released ? 'danger' : 'primary'}
          disabled={!canManage || mutation.isPending || completedResponses === 0}
          onClick={() => setConfirmOpen(true)}
        >
          {released ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          {released ? 'Revogar acesso' : 'Liberar resultados'}
        </Button>
      </div>

      {completedResponses === 0 ? (
        <p className="helper-text">Nenhuma resposta concluída para liberar neste momento.</p>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.label}
        tone={confirmCopy.tone}
        loading={mutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => mutation.mutate()}
      />
    </article>
  )
}
