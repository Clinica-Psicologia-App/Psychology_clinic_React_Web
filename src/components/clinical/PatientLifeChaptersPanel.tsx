import { BookOpen } from 'lucide-react'
import { Badge } from '../design-system/Badge'
import { EmptyState } from '../design-system/EmptyState'
import type { LifeChapterRow } from '../../types'

const EMOTION_TONE: Record<string, 'danger' | 'warning' | 'info' | 'success' | 'neutral'> = {
  tristeza: 'warning', medo: 'danger', raiva: 'danger', confusão: 'warning',
  alegria: 'success', paz: 'success', esperança: 'info', solidão: 'neutral',
  sad: 'warning', scared: 'danger', angry: 'danger', confused: 'warning',
  happy: 'success', peaceful: 'success', hopeful: 'info', lonely: 'neutral',
}

function yearRange(chapter: LifeChapterRow): string {
  if (!chapter.start_year && !chapter.end_year) return ''
  if (chapter.start_year && !chapter.end_year) return `${chapter.start_year} –`
  if (!chapter.start_year && chapter.end_year) return `– ${chapter.end_year}`
  if (chapter.start_year === chapter.end_year) return `${chapter.start_year}`
  return `${chapter.start_year} – ${chapter.end_year}`
}

export function PatientLifeChaptersPanel({ chapters }: { chapters: LifeChapterRow[] }) {
  return (
    <article className="panel report-table-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Narrativa de vida</span>
          <h2>Capítulos da vida</h2>
          <p>
            {chapters.length
              ? `${chapters.length} período${chapters.length !== 1 ? 's' : ''} registrado${chapters.length !== 1 ? 's' : ''} pelo paciente.`
              : 'Períodos significativos da trajetória do paciente, organizados cronologicamente.'}
          </p>
        </div>
        <BookOpen size={20} aria-hidden="true" />
      </div>

      {chapters.length ? (
        <div className="life-chapters-timeline">
          {chapters.map((chapter) => {
            const range = yearRange(chapter)
            return (
              <div className="life-chapter-item" key={chapter.id}>
                <div className="life-chapter-years">{range || '—'}</div>
                <div className="life-chapter-content">
                  <div className="life-chapter-header">
                    <strong>{chapter.title}</strong>
                    {chapter.dominant_emotion && (
                      <Badge tone={EMOTION_TONE[chapter.dominant_emotion.toLowerCase()] ?? 'neutral'}>
                        {chapter.dominant_emotion}
                      </Badge>
                    )}
                  </div>
                  {chapter.description && (
                    <p className="life-chapter-desc">{chapter.description}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Nenhum capítulo registrado"
          description="O paciente ainda não registrou capítulos da sua história de vida no aplicativo."
        />
      )}
    </article>
  )
}
