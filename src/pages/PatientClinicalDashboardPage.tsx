import { useQuery } from '@tanstack/react-query'
import { LockKeyhole } from 'lucide-react'
import { DataState, EmptyState, PageHeader } from '../components/Ui'
import { PatientClinicalDashboardPanel } from '../components/clinical/PatientClinicalDashboardPanel'
import { formatDate } from '../lib/format'
import {
  getPatientPortalMonitoring,
  getPatientPortalPlan,
  getPatientPortalResults,
  getPatientPortalTimeline,
} from '../services/supabaseQueries'

export function PatientClinicalDashboardPage() {
  const query = useQuery({
    queryKey: ['patient-portal-dashboard'],
    queryFn: async () => {
      const [results, monitoring, plan, timelineEvents] = await Promise.all([
        getPatientPortalResults(),
        getPatientPortalMonitoring(),
        getPatientPortalPlan(),
        getPatientPortalTimeline(),
      ])
      return { results, monitoring, plan, timelineEvents }
    },
  })

  const data = query.data
  const released = Boolean(data?.results.patient.results_released_at)

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Meu painel"
        description="Visão geral do seu acompanhamento. Somente leitura."
      />

      <DataState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {data ? (
          <>
            {!released ? (
              <EmptyState
                icon={LockKeyhole}
                title="Resultados ainda não liberados"
                description="Seu psicólogo precisa revisar e liberar os resultados antes que os destaques de esquemas apareçam aqui. Plano, eventos e check-ins já são exibidos abaixo."
              />
            ) : (
              <p className="helper-text">Resultados liberados em {formatDate(data.results.patient.results_released_at)}.</p>
            )}
            <PatientClinicalDashboardPanel
              audience="patient"
              data={{
                responses: data.results.responses,
                responseResults: data.results.responseResults,
                problems: data.plan.problems,
                goals: data.plan.goals,
                timelineEvents: data.timelineEvents,
                checkIns: data.monitoring.checkIns,
              }}
            />
          </>
        ) : null}
      </DataState>
    </div>
  )
}
