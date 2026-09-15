import { useState } from 'react'
import { Activity, HeartPulse } from 'lucide-react'
import { Badge, EmptyState } from '../Ui'
import type { PatientDetailData } from '../../types'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function scoreTone(value?: number | null): 'success' | 'warning' | 'info' | 'neutral' {
  if (value == null) return 'neutral'
  if (value >= 7) return 'info'
  if (value >= 4) return 'warning'
  return 'success'
}

type Tab = 'checkins' | 'monitors'

export function PatientMonitoringPanel({ data }: { data: PatientDetailData }) {
  const [tab, setTab] = useState<Tab>('checkins')
  const checkIns = data.checkIns
  const monitors = data.dailyMonitors

  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Monitoramento</span>
          <h2>Registros de acompanhamento</h2>
          <p>Check-ins e monitores diários do paciente.</p>
        </div>
        <div className="monitor-panel-stats">
          <span><HeartPulse size={14} aria-hidden="true" />{checkIns.length} check-ins</span>
          <span><Activity size={14} aria-hidden="true" />{monitors.length} monitores</span>
        </div>
      </div>

      <div className="monitor-panel-tabs">
        <button type="button" className={`monitor-panel-tab${tab === 'checkins' ? ' active' : ''}`} onClick={() => setTab('checkins')}>
          <HeartPulse size={14} aria-hidden="true" /> Check-ins ({checkIns.length})
        </button>
        <button type="button" className={`monitor-panel-tab${tab === 'monitors' ? ' active' : ''}`} onClick={() => setTab('monitors')}>
          <Activity size={14} aria-hidden="true" /> Monitores diários ({monitors.length})
        </button>
      </div>

      {tab === 'checkins' ? (
        checkIns.length ? (
          <div className="table-card compact-table report-table detail-table">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Humor</th>
                  <th>Ansiedade</th>
                  <th>Energia</th>
                  <th>Intensidade</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {checkIns.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDateTime(item.checked_in_at)}</td>
                    <td><Badge tone={scoreTone(item.mood_score)}>{item.mood_score ?? '—'}</Badge></td>
                    <td><Badge tone={scoreTone(item.anxiety_score)}>{item.anxiety_score ?? '—'}</Badge></td>
                    <td><Badge tone={scoreTone(item.energy_score)}>{item.energy_score ?? '—'}</Badge></td>
                    <td><Badge tone={scoreTone(item.problem_intensity_score)}>{item.problem_intensity_score ?? '—'}</Badge></td>
                    <td className="monitor-notes-cell">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={HeartPulse} title="Nenhum check-in registrado" description="O paciente ainda não realizou nenhum check-in." />
        )
      ) : (
        monitors.length ? (
          <div className="monitoring-list">
            {monitors.map((item) => (
              <div className="monitoring-item" key={item.id}>
                <div>
                  <strong>{formatDateTime(item.created_at)}</strong>
                  <span>{item.mood_notes || 'Humor não informado.'}</span>
                </div>
                <div className="monitoring-notes-grid">
                  <p><strong>Sono</strong>{item.sleep_notes || '—'}</p>
                  <p><strong>Atividade</strong>{item.activity_notes || '—'}</p>
                  <p><strong>Emoções</strong>{item.emotion_notes || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Activity} title="Nenhum monitor diário" description="O paciente ainda não registrou nenhum monitor diário." />
        )
      )}
    </article>
  )
}
