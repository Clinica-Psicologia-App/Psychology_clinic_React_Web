import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown, ChevronRight, Heart, LayoutList, Loader2,
  Network, Plus, Users2,
} from 'lucide-react'
import { DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { GenogramDiagram } from '../components/clinical/GenogramDiagram'
import { createMyTimelineEvent, getPatientPortalGenogram } from '../services/supabaseQueries'
import type { GenogramPersonRow } from '../types'

const REL_LABELS: Record<string, string> = {
  mae: 'Mãe',
  pai: 'Pai',
  irmao: 'Irmão/irmã',
  conjuge: 'Cônjuge/parceiro(a)',
  filho: 'Filho(a)',
  avo_materno: 'Avó/avô maternos',
  avo_paterno: 'Avó/avô paternos',
  tio_materno: 'Tio/tia maternos',
  tio_paterno: 'Tio/tia paternos',
  primo: 'Primo(a)',
  outro: 'Outro familiar',
}

const EXPLORE_PROMPTS = [
  { key: 'relacao_mae', label: 'Como você descreveria sua relação com sua mãe (ou figura materna)?', placeholder: 'Descreva livremente...' },
  { key: 'relacao_pai', label: 'E com seu pai (ou figura paterna)?', placeholder: 'Descreva livremente...' },
  { key: 'dinamica_familia', label: 'Qual era a dinâmica geral da sua família de origem?', placeholder: 'Ex: muito unida, conflituosa, distante, superprotetora...' },
  { key: 'apego_infancia', label: 'De quem você se sentia mais próximo quando criança?', placeholder: 'Quem foi essa pessoa e o que a tornava especial?' },
  { key: 'padroes_percepcao', label: 'Você percebe algum padrão que se repete nas suas relações familiares?', placeholder: 'Conflitos recorrentes, formas de lidar com emoções, etc.' },
]

function relLabel(val?: string | null) {
  return REL_LABELS[val ?? ''] ?? val ?? '—'
}

function PersonCard({ person, onDeepen }: { person: GenogramPersonRow; onDeepen: (p: GenogramPersonRow) => void }) {
  const initials = person.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  return (
    <article className="family-person-card">
      <div className="family-person-avatar">{initials}</div>
      <div className="family-person-info">
        <strong>{person.full_name}</strong>
        <span>{relLabel(person.relationship_to_patient)}</span>
        {person.is_deceased ? <span className="family-person-deceased">Falecido(a)</span> : null}
      </div>
      <button type="button" className="family-person-deepen-btn" onClick={() => onDeepen(person)} title="Aprofundar relação">
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </article>
  )
}

type DeepenForm = {
  notes: string
  emotional_impact: string
}

type ExploreForm = Record<string, string>

export function PatientFamilyPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'diagram' | 'list'>('list')
  const [deepenPerson, setDeepenPerson] = useState<GenogramPersonRow | null>(null)
  const [deepenForm, setDeepenForm] = useState<DeepenForm>({ notes: '', emotional_impact: '5' })
  const [exploreOpen, setExploreOpen] = useState(false)
  const [exploreForm, setExploreForm] = useState<ExploreForm>({})
  const [exploreStep, setExploreStep] = useState(0)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const genogram = useQuery({ queryKey: ['patient-portal-genogram'], queryFn: getPatientPortalGenogram })
  const persons = genogram.data?.persons ?? []
  const relationships = genogram.data?.relationships ?? []

  const deepenMutation = useMutation({
    mutationFn: (payload: { person: GenogramPersonRow; form: DeepenForm }) =>
      createMyTimelineEvent({
        title: `Reflexão sobre ${payload.person.full_name}`,
        description: payload.form.notes,
        category: 'relacionamentos',
        emotional_impact: payload.form.emotional_impact ? Number(payload.form.emotional_impact) : null,
      }),
    onSuccess: async () => {
      setDeepen(null)
      setNotice({ tone: 'success', text: 'Reflexão salva na sua linha do tempo.' })
      await queryClient.invalidateQueries({ queryKey: ['patient-portal-timeline'] })
    },
    onError: (err) => setNotice({ tone: 'error', text: (err as Error).message }),
  })

  const exploreMutation = useMutation({
    mutationFn: () => {
      const desc = EXPLORE_PROMPTS.filter((p) => exploreForm[p.key])
        .map((p) => `**${p.label}**\n${exploreForm[p.key]}`)
        .join('\n\n')
      return createMyTimelineEvent({
        title: 'Exploração de contexto familiar',
        description: desc,
        category: 'familia',
        period_label: 'Reflexão guiada',
      })
    },
    onSuccess: async () => {
      setExploreOpen(false)
      setExploreForm({})
      setExploreStep(0)
      setNotice({ tone: 'success', text: 'Reflexão familiar salva na sua linha do tempo.' })
      await queryClient.invalidateQueries({ queryKey: ['patient-portal-timeline'] })
    },
    onError: (err) => setNotice({ tone: 'error', text: (err as Error).message }),
  })

  function setDeepen(person: GenogramPersonRow | null) {
    setDeepenPerson(person)
    setDeepenForm({ notes: '', emotional_impact: '5' })
  }

  const deceased = persons.filter((p) => p.is_deceased).length

  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Área do paciente"
        title="Minha família"
        description="Veja e explore as pessoas da sua história familiar."
        action={
          <Button variant="secondary" onClick={() => setExploreOpen(true)}>
            <Heart size={16} aria-hidden="true" /> Explorar contexto familiar
          </Button>
        }
      />

      {notice ? (
        <InlineNotice tone={notice.tone} message={notice.text} onDismiss={() => setNotice(null)} autoDismissMs={notice.tone === 'success' ? 5000 : undefined} />
      ) : null}

      <section className="stats-grid three">
        <StatCard label="Pessoas" value={persons.length} icon={Users2} />
        <StatCard label="Relações" value={relationships.length} icon={Heart} tone="blue" />
        <StatCard label="Falecidos" value={deceased} icon={Users2} tone="navy" />
      </section>

      <DataState loading={genogram.isLoading} error={genogram.error} onRetry={() => genogram.refetch()}>
        {persons.length ? (
          <>
            <div className="panel-toolbar">
              <button
                type="button"
                className={`icon-toggle-btn${view === 'list' ? ' active' : ''}`}
                onClick={() => setView('list')}
                title="Lista"
              >
                <LayoutList size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`icon-toggle-btn${view === 'diagram' ? ' active' : ''}`}
                onClick={() => setView('diagram')}
                title="Diagrama"
              >
                <Network size={16} aria-hidden="true" />
              </button>
            </div>

            {view === 'diagram' ? (
              <div className="panel">
                <GenogramDiagram
                  patientName="Você"
                  persons={persons}
                  relationships={relationships}
                  onNodeClick={(p) => setDeepen(p)}
                />
              </div>
            ) : (
              <div className="family-list-grid">
                {persons.map((person) => (
                  <PersonCard key={person.id} person={person} onDeepen={setDeepen} />
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Users2}
            title="Nenhuma pessoa no genograma"
            description="As pessoas da sua família aparecerão aqui quando seu psicólogo ou você adicioná-las."
            action={
              <Button variant="secondary" onClick={() => setExploreOpen(true)}>
                <Plus size={16} aria-hidden="true" /> Explorar contexto familiar
              </Button>
            }
          />
        )}
      </DataState>

      {/* ── Deepen relationship modal ── */}
      {deepenPerson ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDeepen(null)}>
          <form
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              deepenMutation.mutate({ person: deepenPerson, form: deepenForm })
            }}
          >
            <header>
              <h2>Reflexão sobre {deepenPerson.full_name}</h2>
              <p>{relLabel(deepenPerson.relationship_to_patient)}</p>
            </header>
            <label>
              Como você descreveria sua relação com {deepenPerson.nickname ?? deepenPerson.full_name.split(' ')[0]}?
              <textarea
                autoFocus
                rows={5}
                value={deepenForm.notes}
                onChange={(e) => setDeepenForm({ ...deepenForm, notes: e.target.value })}
                placeholder="Descreva livremente como foi e como é essa relação..."
                required
              />
            </label>
            <label>
              Impacto emocional dessa relação (0 = neutro · 10 = muito intenso)
              <div className="impact-slider-row">
                <input
                  type="range" min="0" max="10"
                  value={deepenForm.emotional_impact}
                  onChange={(e) => setDeepenForm({ ...deepenForm, emotional_impact: e.target.value })}
                />
                <strong>{deepenForm.emotional_impact}/10</strong>
              </div>
            </label>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setDeepen(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={deepenMutation.isPending}>
                {deepenMutation.isPending ? <><Loader2 size={16} className="spin" aria-hidden="true" /> Salvando...</> : 'Salvar reflexão'}
              </Button>
            </footer>
          </form>
        </div>
      ) : null}

      {/* ── Guided family context exploration ── */}
      {exploreOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setExploreOpen(false)}>
          <div className="modal-card wide-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Explorar contexto familiar</h2>
              <div className="wizard-steps">
                {EXPLORE_PROMPTS.map((p, i) => (
                  <span key={p.key} className={i === exploreStep ? 'active' : i < exploreStep ? 'done' : ''}>
                    {i + 1}
                  </span>
                ))}
              </div>
            </header>
            <div className="wizard-step-body">
              <p className="wizard-step-hint">{EXPLORE_PROMPTS[exploreStep].label}</p>
              <textarea
                autoFocus
                rows={6}
                value={exploreForm[EXPLORE_PROMPTS[exploreStep].key] ?? ''}
                onChange={(e) => setExploreForm({ ...exploreForm, [EXPLORE_PROMPTS[exploreStep].key]: e.target.value })}
                placeholder={EXPLORE_PROMPTS[exploreStep].placeholder}
              />
              {exploreStep > 0 ? (
                <div className="explore-prev-answers">
                  {EXPLORE_PROMPTS.slice(0, exploreStep).filter((p) => exploreForm[p.key]).map((prev) => (
                    <div key={prev.key} className="explore-prev-item">
                      <span>{prev.label}</span>
                      <button
                        type="button"
                        className="explore-prev-toggle"
                        onClick={() => setExploreStep(EXPLORE_PROMPTS.indexOf(prev))}
                      >
                        Editar <ChevronDown size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <footer>
                {exploreStep > 0 ? (
                  <Button variant="ghost" type="button" onClick={() => setExploreStep((s) => s - 1)}>Voltar</Button>
                ) : (
                  <Button variant="ghost" type="button" onClick={() => setExploreOpen(false)}>Cancelar</Button>
                )}
                {exploreStep < EXPLORE_PROMPTS.length - 1 ? (
                  <Button variant="primary" type="button" onClick={() => setExploreStep((s) => s + 1)}>Próxima pergunta</Button>
                ) : (
                  <Button variant="primary" type="button" disabled={exploreMutation.isPending} onClick={() => exploreMutation.mutate()}>
                    {exploreMutation.isPending ? <><Loader2 size={16} className="spin" aria-hidden="true" /> Salvando...</> : 'Salvar reflexão'}
                  </Button>
                )}
              </footer>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
