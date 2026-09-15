import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowLeft, HeartPulse } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { getMyPatientCheckIn } from '../services/supabaseQueries'

function formatDateTime(value?: string | null) {
  if (!value) return 'Data não informada'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
}

function ScoreBar({ label, value, tone }: { label: string; value: number | null; tone: 'success' | 'warning' | 'info' | 'neutral' }) {
  const display = value ?? 0
  return (
    <div className="check-in-score-row">
      <div className="check-in-score-label">
        <span>{label}</span>
        <Badge tone={tone}>{value ?? '-'}/10</Badge>
      </div>
      <div className="check-in-score-track">
        <div className="check-in-score-fill" style={{ width: `${display * 10}%` }} data-tone={tone} />
      </div>
    </div>
  )
}

export function PatientCheckInDetailPage() {
  const { checkInId } = useParams()
  const query = useQuery({
    queryKey: ['patient-check-in-detail', checkInId],
    queryFn: () => getMyPatientCheckIn(checkInId!),
    enabled: Boolean(checkInId),
  })

  const item = query.data

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Meu acompanhamento"
        title="Detalhe do check-in"
        description={item ? formatDateTime(item.checked_in_at) : 'Carregando...'}
        action={
          <Link to="/meu-acompanhamento">
            <Button variant="ghost"><ArrowLeft size={16} aria-hidden="true" /> Voltar</Button>
          </Link>
        }
      />

      <DataState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {item ? (
          <div className="check-in-detail-grid">
            <article className="panel check-in-scores-panel">
              <div className="panel-header">
                <div><h2>Registros do dia</h2><p>Escala de 0 (mínimo) a 10 (máximo).</p></div>
                <HeartPulse size={20} aria-hidden="true" />
              </div>
              <div className="check-in-scores-list">
                <ScoreBar label="Humor" value={item.mood_score} tone="success" />
                <ScoreBar label="Ansiedade" value={item.anxiety_score} tone="warning" />
                <ScoreBar label="Energia" value={item.energy_score} tone="info" />
                <ScoreBar label="Intensidade do problema" value={item.problem_intensity_score} tone="neutral" />
              </div>
            </article>

            {item.notes ? (
              <article className="panel">
                <div className="panel-header">
                  <div><h2>Observações</h2><p>Anotações registradas neste check-in.</p></div>
                  <Activity size={20} aria-hidden="true" />
                </div>
                <p className="check-in-notes-text">{item.notes}</p>
              </article>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={HeartPulse}
            title="Check-in não encontrado"
            description="Este registro não está disponível para o seu usuário."
            action={<Link to="/meu-acompanhamento"><Button variant="secondary">Voltar ao acompanhamento</Button></Link>}
          />
        )}
      </DataState>
    </div>
  )
}
