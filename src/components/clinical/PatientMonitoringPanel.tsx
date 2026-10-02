import { useState } from 'react'
import { Activity, HeartPulse } from 'lucide-react'
import { Badge, EmptyState } from '../Ui'
import type { PatientDetailData, PatientCheckInRow } from '../../types'

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

// Mesmos labels do Flutter
const MOOD_LABELS: Record<number, string> = {
  0: 'Péssimo', 1: 'Muito mal', 2: 'Mal', 3: 'Para baixo', 4: 'Não muito bem',
  5: 'Neutro', 6: 'Razoavelmente bem', 7: 'Bem', 8: 'Muito bem', 9: 'Ótimo', 10: 'Excelente',
}
const ANXIETY_LABELS: Record<number, string> = {
  0: 'Sem ansiedade', 1: 'Quase nenhuma', 2: 'Muito leve', 3: 'Leve', 4: 'Um pouco ansioso(a)',
  5: 'Moderada', 6: 'Considerável', 7: 'Forte', 8: 'Muito forte', 9: 'Intensa', 10: 'Extrema',
}
const ENERGY_LABELS: Record<number, string> = {
  0: 'Sem energia', 1: 'Quase nenhuma', 2: 'Muito baixa', 3: 'Baixa', 4: 'Um pouco baixa',
  5: 'Moderada', 6: 'Um pouco alta', 7: 'Alta', 8: 'Muito alta', 9: 'Intensa', 10: 'Máxima',
}
const SLEEP_LABELS: Record<number, string> = {
  0: 'Péssima', 1: 'Muito ruim', 2: 'Ruim', 3: 'Pouco reparadora', 4: 'Abaixo do ideal',
  5: 'Razoável', 6: 'Satisfatória', 7: 'Boa', 8: 'Muito boa', 9: 'Ótima', 10: 'Excelente',
}
const STRESS_LABELS: Record<number, string> = {
  0: 'Sem estresse', 1: 'Quase nenhum', 2: 'Muito leve', 3: 'Leve', 4: 'Leve a moderado',
  5: 'Moderado', 6: 'Moderado a forte', 7: 'Forte', 8: 'Muito forte', 9: 'Intenso', 10: 'Extremo',
}

function ScoreCell({ value, labels }: { value?: number | null; labels: Record<number, string> }) {
  if (value == null) return <td>—</td>
  return (
    <td>
      <Badge tone={scoreTone(value)}>
        {value} <span style={{ fontWeight: 400, opacity: 0.8 }}>· {labels[value] ?? ''}</span>
      </Badge>
    </td>
  )
}

function CheckInDetail({ item }: { item: PatientCheckInRow }) {
  const modes = item.selected_modes ?? []
  const emotions = item.mood_emotions ?? []
  const hasExtra = modes.length > 0 || emotions.length > 0 || item.notes

  return (
    <tr>
      <td>{formatDateTime(item.checked_in_at)}</td>
      <ScoreCell value={item.mood_score} labels={MOOD_LABELS} />
      <ScoreCell value={item.anxiety_score} labels={ANXIETY_LABELS} />
      <ScoreCell value={item.energy_score} labels={ENERGY_LABELS} />
      <ScoreCell value={item.sleep_score} labels={SLEEP_LABELS} />
      <ScoreCell value={item.stress_score} labels={STRESS_LABELS} />
      <ScoreCell value={item.problem_intensity_score} labels={{ 0:'Nenhuma',1:'Mínima',2:'Muito leve',3:'Leve',4:'Leve-mod.',5:'Moderada',6:'Mod.-forte',7:'Forte',8:'Muito forte',9:'Severa',10:'Máxima' }} />
      <td>
        {hasExtra ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {emotions.length > 0 && (
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                {emotions.join(' · ')}
              </span>
            )}
            {modes.length > 0 && (
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-brand-navy)' }}>
                {modes.map(m => m.clinical_name || m.patient_label).join(', ')}
              </span>
            )}
            {item.notes && (
              <span style={{ fontSize: 'var(--text-caption)' }}>{item.notes}</span>
            )}
          </div>
        ) : '—'}
      </td>
    </tr>
  )
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
          <div className="table-card compact-table report-table detail-table" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Humor</th>
                  <th>Ansiedade</th>
                  <th>Energia</th>
                  <th>Sono</th>
                  <th>Estresse</th>
                  <th>Intensidade</th>
                  <th>Emoções · Modos · Obs.</th>
                </tr>
              </thead>
              <tbody>
                {checkIns.map((item) => <CheckInDetail key={item.id} item={item} />)}
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
