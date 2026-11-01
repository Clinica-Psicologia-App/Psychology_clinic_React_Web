import { useMemo } from 'react'
import { AlertTriangle, LayoutDashboard } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { formatDate } from '../../lib/format'
import type { PatientDetailData, PatientQuestionnaireResponseRow } from '../../types'

const ACTIVATION_THRESHOLD = 4.0
const RECENT_CHECK_IN_DAYS = 7
const ATTACHMENT_CODE = 'ATTACHMENT_STYLES_V1'
const YCI_CODE = 'YCI_FOUNDATION_V1'
const YRAI_CODE = 'YRAI_FOUNDATION_V1'

type ScoreRow = { code: string; name: string; score: number }

function latestCompleted(
  responses: PatientQuestionnaireResponseRow[],
  match: (code: string) => boolean,
  withResults: Set<string>,
) {
  return responses
    .filter((r) => r.status === 'completed' && withResults.has(r.id) && match(r.questionnaire_code.toUpperCase()))
    .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at))[0]
}

function formatScore(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function ScoreList({ title, rows, activationAware = false }: { title: string; rows: ScoreRow[]; activationAware?: boolean }) {
  return (
    <div className="clinical-dash-block">
      <h3>{title}</h3>
      {rows.length ? (
        <ul>
          {rows.map((row) => (
            <li key={row.code}>
              <span>{row.name}</span>
              <strong>
                {formatScore(row.score)}
                {activationAware && row.score >= ACTIVATION_THRESHOLD ? <Badge tone="danger">Ativado</Badge> : null}
              </strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="clinical-dash-empty">Sem resultado concluído.</p>
      )}
    </div>
  )
}

export type ClinicalDashboardSource = Pick<
  PatientDetailData,
  'responses' | 'responseResults' | 'problems' | 'goals' | 'timelineEvents' | 'checkIns'
>

export function PatientClinicalDashboardPanel({
  data,
  audience = 'staff',
}: {
  data: ClinicalDashboardSource
  audience?: 'staff' | 'patient'
}) {
  const summary = useMemo(() => {
    const resultsByResponse = new Map<string, ScoreRow[]>()
    for (const result of data.responseResults) {
      const score = result.professional_average_score ?? result.average_score
      if (score == null) continue
      const list = resultsByResponse.get(result.response_id) ?? []
      list.push({
        code: result.category_code ?? result.id,
        name: result.category_name ?? result.category_code ?? 'Categoria',
        score,
      })
      resultsByResponse.set(result.response_id, list)
    }
    const withResults = new Set(resultsByResponse.keys())

    const top = (response: PatientQuestionnaireResponseRow | undefined, prefix?: string, limit = 5): ScoreRow[] => {
      if (!response) return []
      return (resultsByResponse.get(response.id) ?? [])
        .filter((row) => (prefix ? row.code.startsWith(prefix) : true))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    }

    const ysq = latestCompleted(data.responses, (c) => c.includes('YSQ'), withResults)
    const yami = latestCompleted(data.responses, (c) => c.includes('YAMI'), withResults)
    const attachment = latestCompleted(data.responses, (c) => c === ATTACHMENT_CODE, withResults)
    const yci = latestCompleted(data.responses, (c) => c === YCI_CODE, withResults)
    const yrai = latestCompleted(data.responses, (c) => c === YRAI_CODE, withResults)

    const coping = [...top(yci, undefined, 3), ...top(yrai, undefined, 3)].sort((a, b) => b.score - a.score).slice(0, 3)

    const openProblems = data.problems
      .filter((p) => p.status === 'active')
      .sort((a, b) => (b.intensity ?? -1) - (a.intensity ?? -1) || (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at))
    const activeGoals = data.goals
      .filter((g) => g.status === 'active')
      .sort((a, b) => {
        if (a.target_date && b.target_date) return a.target_date.localeCompare(b.target_date)
        if (a.target_date) return -1
        if (b.target_date) return 1
        return (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at)
      })
    const events = [...data.timelineEvents].sort(
      (a, b) => (b.emotional_impact ?? -1) - (a.emotional_impact ?? -1) || (b.event_date ?? b.created_at).localeCompare(a.event_date ?? a.created_at),
    )
    const latestCheckIn = [...data.checkIns].sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at))[0]
    const recentCheckIn = latestCheckIn
      ? Date.now() - new Date(latestCheckIn.checked_in_at).getTime() <= RECENT_CHECK_IN_DAYS * 86_400_000
      : false

    const alerts: string[] = []
    if (!ysq && !yami) {
      alerts.push('Ainda não há YSQ ou YAMI concluídos. Aplique os instrumentos para enriquecer a visão clínica.')
    } else {
      if (!ysq) alerts.push('Nenhuma aplicação YSQ concluída. Considere aplicar o inventário de esquemas iniciais.')
      if (!yami) alerts.push('Nenhuma aplicação YAMI concluída. Considere aplicar o inventário de modos esquemáticos.')
    }
    if (!recentCheckIn) alerts.push('Não há check-in recente. O registro do estado atual ajuda a acompanhar sinais entre sessões.')

    return {
      alerts,
      schemas: top(ysq, 'YSQ_SCHEMA_'),
      modes: top(yami, 'YAMI_MODE_'),
      attachment: top(attachment, undefined, 3),
      coping,
      openProblems,
      activeGoals,
      events,
      latestCheckIn,
    }
  }, [data])

  return (
    <article className="panel clinical-dash-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{audience === 'patient' ? 'Meu painel' : 'Dashboard clínico'}</span>
          <h2>{audience === 'patient' ? 'Resumo do meu acompanhamento' : 'Resumo do caso'}</h2>
          <p>
            {audience === 'patient'
              ? 'Destaques dos seus resultados liberados, do seu plano e dos seus registros.'
              : 'Destaques consolidados dos últimos resultados concluídos, do plano clínico e do acompanhamento.'}
          </p>
        </div>
        <LayoutDashboard size={20} aria-hidden="true" />
      </div>

      {audience === 'staff' && summary.alerts.length ? (
        <div className="clinical-dash-alerts">
          {summary.alerts.map((message) => (
            <div key={message}><AlertTriangle size={15} aria-hidden="true" /><span>{message}</span></div>
          ))}
        </div>
      ) : null}

      <div className="clinical-dash-grid">
        <ScoreList title="Esquemas em destaque (YSQ)" rows={summary.schemas} activationAware />
        <ScoreList title="Modos em destaque (YAMI)" rows={summary.modes} />
        <ScoreList title="Estilos de apego" rows={summary.attachment} />
        <ScoreList title="Enfrentamento (YCI / YRAI)" rows={summary.coping} />

        <div className="clinical-dash-block">
          <h3>Problemas abertos ({summary.openProblems.length})</h3>
          {summary.openProblems.length ? (
            <ul>
              {summary.openProblems.slice(0, 3).map((problem) => (
                <li key={problem.id}>
                  <span>{problem.title}</span>
                  <strong>{problem.intensity != null ? `${problem.intensity}/10` : '—'}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="clinical-dash-empty">Nenhum problema ativo.</p>}
        </div>

        <div className="clinical-dash-block">
          <h3>Metas ativas ({summary.activeGoals.length})</h3>
          {summary.activeGoals.length ? (
            <ul>
              {summary.activeGoals.slice(0, 3).map((goal) => (
                <li key={goal.id}>
                  <span>{goal.title}</span>
                  <strong>{goal.target_date ? formatDate(goal.target_date) : `${goal.progress ?? 0}%`}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="clinical-dash-empty">Nenhuma meta ativa.</p>}
        </div>

        <div className="clinical-dash-block">
          <h3>Eventos de maior impacto ({summary.events.length})</h3>
          {summary.events.length ? (
            <ul>
              {summary.events.slice(0, 3).map((event) => (
                <li key={event.id}>
                  <span>{event.is_sensitive ? 'Evento sensível' : event.title}</span>
                  <strong>{event.emotional_impact != null ? `${event.emotional_impact}/10` : '—'}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="clinical-dash-empty">Sem eventos na linha do tempo.</p>}
        </div>

        <div className="clinical-dash-block">
          <h3>Último check-in</h3>
          {summary.latestCheckIn ? (
            <ul>
              <li><span>Data</span><strong>{formatDate(summary.latestCheckIn.checked_in_at)}</strong></li>
              <li><span>Humor</span><strong>{summary.latestCheckIn.mood_score ?? '—'}</strong></li>
              <li><span>Ansiedade</span><strong>{summary.latestCheckIn.anxiety_score ?? '—'}</strong></li>
              <li><span>Estresse</span><strong>{summary.latestCheckIn.stress_score ?? '—'}</strong></li>
            </ul>
          ) : <p className="clinical-dash-empty">Nenhum check-in registrado.</p>}
        </div>
      </div>
    </article>
  )
}
