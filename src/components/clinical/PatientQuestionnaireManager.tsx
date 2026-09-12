import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ClipboardCheck, ClipboardList, LockKeyhole } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { useAuth } from '../../context/auth'
import { formatDate } from '../../lib/format'
import { assignQuestionnaireToPatient, cancelPatientQuestionnaireAssignment } from '../../services/supabaseQueries'
import type { PatientDetailData, PatientQuestionnaireAssignmentRow } from '../../types'

function assignmentLabel(assignment?: PatientQuestionnaireAssignmentRow) {
  if (!assignment) return 'Não liberado'
  if (assignment.response_id) return 'Em resposta'
  return 'Liberado'
}

export function PatientQuestionnaireManager({ data, onChanged }: {
  data: PatientDetailData
  onChanged: () => Promise<unknown>
}) {
  const { profile } = useAuth()
  const [messageByQuestionnaire, setMessageByQuestionnaire] = useState<Record<string, string>>({})
  const activeAssignments = useMemo(
    () => new Map(data.questionnaireAssignments.filter((assignment) => !assignment.cancelled_at).map((assignment) => [assignment.questionnaire_id, assignment])),
    [data.questionnaireAssignments],
  )
  const canManage = Boolean(profile?.role === 'psychologist' && profile.id === data.patient.responsible_psychologist_id)

  const assignMutation = useMutation({
    mutationFn: ({ questionnaireId, message }: { questionnaireId: string; message?: string }) => assignQuestionnaireToPatient({
      patient_id: data.patient.id,
      questionnaire_id: questionnaireId,
      message,
    }),
    onSuccess: async () => { await onChanged() },
  })

  const cancelMutation = useMutation({
    mutationFn: (questionnaireId: string) => cancelPatientQuestionnaireAssignment({
      patient_id: data.patient.id,
      questionnaire_id: questionnaireId,
    }),
    onSuccess: async () => { await onChanged() },
  })

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Instrumentos do paciente</span>
          <h2>Questionários liberados</h2>
          <p>Respeita dois níveis: admin libera para psicólogo; psicólogo libera para paciente.</p>
        </div>
        <ClipboardList size={20} aria-hidden="true" />
      </div>

      {!canManage ? (
        <div className="state-panel">
          <LockKeyhole size={20} aria-hidden="true" />
          <div>
            <strong>Ação restrita ao psicólogo responsável</strong>
            <p>Este painel pode consultar o estado, mas a liberação segura deve ser feita pelo psicólogo responsável do paciente.</p>
          </div>
        </div>
      ) : null}

      {assignMutation.error || cancelMutation.error ? (
        <div className="form-step-error">
          {((assignMutation.error ?? cancelMutation.error) as Error).message}
        </div>
      ) : null}

      {data.availableQuestionnaires.length ? (
        <div className="table-card compact-table report-table detail-table">
          <table>
            <thead>
              <tr>
                <th>Questionário</th>
                <th>Status para paciente</th>
                <th>Mensagem</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.availableQuestionnaires.map((questionnaire) => {
                const assignment = activeAssignments.get(questionnaire.id)
                const pending = assignMutation.isPending || cancelMutation.isPending
                return (
                  <tr key={questionnaire.id}>
                    <td>
                      <strong>{questionnaire.name}</strong>
                      <small>{questionnaire.code} · {questionnaire.clinical_status ?? 'sem status'}</small>
                    </td>
                    <td>
                      <Badge tone={assignment ? 'success' : 'neutral'}>{assignmentLabel(assignment)}</Badge>
                      {assignment ? <small>Liberado em {formatDate(assignment.assigned_at)}</small> : null}
                    </td>
                    <td>
                      {assignment?.message ? <small>{assignment.message}</small> : (
                        <input
                          value={messageByQuestionnaire[questionnaire.id] ?? ''}
                          onChange={(event) => setMessageByQuestionnaire({ ...messageByQuestionnaire, [questionnaire.id]: event.target.value })}
                          placeholder="Mensagem opcional ao paciente"
                          disabled={!canManage || Boolean(assignment)}
                        />
                      )}
                    </td>
                    <td>
                      {assignment ? (
                        <Button variant="danger" size="sm" disabled={!canManage || pending || Boolean(assignment.response_id)} onClick={() => cancelMutation.mutate(questionnaire.id)}>
                          Revogar
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" disabled={!canManage || pending} onClick={() => assignMutation.mutate({ questionnaireId: questionnaire.id, message: messageByQuestionnaire[questionnaire.id] })}>
                          <ClipboardCheck size={15} aria-hidden="true" /> Liberar
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum questionário disponível"
          description="O psicólogo responsável ainda não tem instrumentos liberados pelo administrador."
        />
      )}
    </article>
  )
}

