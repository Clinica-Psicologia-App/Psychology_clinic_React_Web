import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, BookOpen, CalendarDays, ChevronLeft, ChevronRight,
  ClipboardCheck, Heart, HeartPulse, Route, Sparkles, X,
} from 'lucide-react'
import { Button } from './design-system/Button'
import type { ProfileRole } from '../types'

type TourStep = {
  icon: React.ElementType
  title: string
  body: string
  tone: string
  cta?: { label: string; path: string }
}

const PSYCH_STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao EsquemaCore',
    body: 'Aqui você gerencia seus pacientes, conduz avaliações clínicas e acompanha a evolução terapêutica de cada pessoa. Vamos explorar as principais áreas.',
    tone: 'blue',
  },
  {
    icon: ClipboardCheck,
    title: 'Fichas dos pacientes',
    body: 'Na seção Pacientes você encontra a ficha completa de cada pessoa: histórico, objetivos, linha do tempo, genograma e resultados de avaliações.',
    tone: 'green',
    cta: { label: 'Ver pacientes', path: '/pacientes' },
  },
  {
    icon: Activity,
    title: 'Avaliações e instrumentos',
    body: 'Aplique questionários padronizados (YSQ, YAMI e outros) e acompanhe a evolução de scores ao longo do tempo com gráficos longitudinais.',
    tone: 'violet',
    cta: { label: 'Ver questionários', path: '/questionarios' },
  },
  {
    icon: Route,
    title: 'Jornada terapêutica',
    body: 'Cada paciente tem uma trilha visual de progresso — da avaliação inicial à reavaliação. Acompanhe marcos, objetivos e sinais clínicos em um só lugar.',
    tone: 'amber',
  },
  {
    icon: BookOpen,
    title: 'Biblioteca e recursos',
    body: 'Libere materiais terapêuticos personalizados para cada paciente e organize protocolos de acompanhamento através da biblioteca contextual.',
    tone: 'cyan',
    cta: { label: 'Ver biblioteca', path: '/biblioteca-clinica' },
  },
]

const PATIENT_STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: 'Seja bem-vindo(a)!',
    body: 'Este é o seu espaço pessoal no EsquemaCore. Aqui você pode acompanhar sua jornada, registrar como está se sentindo e explorar sua história de vida.',
    tone: 'blue',
  },
  {
    icon: HeartPulse,
    title: 'Meu acompanhamento',
    body: 'Registre check-ins rápidos de humor, ansiedade e energia, e acompanhe monitores diários. Esses dados ajudam seu psicólogo a entender sua evolução.',
    tone: 'green',
    cta: { label: 'Ir para acompanhamento', path: '/meu-acompanhamento' },
  },
  {
    icon: CalendarDays,
    title: 'Minha linha do tempo',
    body: 'Registre momentos e eventos importantes da sua história de vida. Você pode adicionar períodos, datas e o impacto emocional de cada experiência.',
    tone: 'violet',
    cta: { label: 'Ver linha do tempo', path: '/minha-linha-do-tempo' },
  },
  {
    icon: Heart,
    title: 'Minha família',
    body: 'Veja as pessoas mapeadas no seu genograma e explore reflexões sobre suas relações familiares de forma guiada.',
    tone: 'amber',
    cta: { label: 'Ver família', path: '/minha-familia' },
  },
]

const TONE_VARS: Record<string, string> = {
  blue: 'var(--color-brand-blue)',
  green: 'var(--green)',
  violet: 'var(--color-brand-accent)',
  amber: 'var(--yellow)',
  cyan: 'var(--chart-3)',
}

const STORAGE_KEY = (role: ProfileRole) =>
  role === 'patient' ? 'onboarding_patient_done' : 'onboarding_psych_done'

export function OnboardingTour({ role, onDismiss }: { role: ProfileRole; onDismiss: () => void }) {
  const navigate = useNavigate()
  const steps = role === 'patient' ? PATIENT_STEPS : PSYCH_STEPS
  const [step, setStep] = useState(0)
  const current = steps[step]
  const Icon = current.icon
  const toneColor = TONE_VARS[current.tone] ?? 'var(--color-brand-blue)'
  const isLast = step === steps.length - 1

  function finish() {
    try { localStorage.setItem(STORAGE_KEY(role), '1') } catch {}
    onDismiss()
  }

  return (
    <div className="onboarding-backdrop" role="presentation">
      <div className="onboarding-card" role="dialog" aria-modal="true" aria-label="Tour de boas-vindas">
        <button type="button" className="onboarding-close" onClick={finish} aria-label="Fechar tour">
          <X size={18} aria-hidden="true" />
        </button>

        <div className="onboarding-icon-wrap" style={{ background: `color-mix(in srgb, ${toneColor} 12%, transparent)`, color: toneColor }}>
          <Icon size={32} aria-hidden="true" />
        </div>

        <div className="onboarding-body">
          <h2>{current.title}</h2>
          <p>{current.body}</p>
        </div>

        <div className="onboarding-dots" role="tablist" aria-label="Etapas do tour">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === step}
              className={`onboarding-dot${i === step ? ' active' : ''}`}
              style={i === step ? { background: toneColor } : undefined}
              onClick={() => setStep(i)}
              aria-label={`Etapa ${i + 1}`}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          <div className="onboarding-nav">
            <button
              type="button"
              className="onboarding-nav-btn"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              aria-label="Etapa anterior"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="onboarding-nav-btn"
              onClick={() => setStep((s) => s + 1)}
              disabled={isLast}
              aria-label="Próxima etapa"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="onboarding-ctas">
            {current.cta ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { navigate(current.cta!.path); finish() }}
              >
                {current.cta.label}
              </Button>
            ) : null}
            {isLast ? (
              <Button variant="primary" size="sm" onClick={finish}>Começar agora</Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setStep((s) => s + 1)}>
                Próximo <ChevronRight size={14} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
