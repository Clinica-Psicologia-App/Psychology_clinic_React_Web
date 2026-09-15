import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Brain, Heart, Shield, Smile, Sun, Users } from 'lucide-react'
import { PageHeader } from '../components/Ui'
import { Button } from '../components/design-system/Button'

type ModeCard = {
  group: string
  tone: 'child' | 'coping' | 'parent' | 'healthy'
  modes: Array<{ name: string; description: string }>
}

const MODE_GROUPS: ModeCard[] = [
  {
    group: 'Modos Criança',
    tone: 'child',
    modes: [
      {
        name: 'Criança Vulnerável',
        description: 'Parte que sente abandono, rejeição ou desconexão. Carrega emoções de solidão, medo e tristeza ligadas a necessidades não atendidas na infância.',
      },
      {
        name: 'Criança Irritada',
        description: 'Parte que expressa raiva de forma intensa quando necessidades básicas são ignoradas. A raiva serve como sinal de injustiça percebida.',
      },
      {
        name: 'Criança Impulsiva/Indisciplinada',
        description: 'Parte que age de forma imediata para satisfazer desejos e evitar o desconforto, sem considerar consequências futuras.',
      },
      {
        name: 'Criança Feliz',
        description: 'Parte saudável que se manifesta em momentos de alegria, espontaneidade e conexão genuína. Indica que necessidades básicas foram atendidas.',
      },
    ],
  },
  {
    group: 'Modos de Enfrentamento Desadaptativos',
    tone: 'coping',
    modes: [
      {
        name: 'Capitulador Condescendente',
        description: 'Submissão aos outros para evitar conflito ou punição. A pessoa cede às demandas dos outros mesmo contrariando seus próprios valores.',
      },
      {
        name: 'Protetor Isolado',
        description: 'Desconexão emocional para se proteger de sentimentos dolorosos. A pessoa se distancia internamente e externamente para não sentir.',
      },
      {
        name: 'Sobrecompensador',
        description: 'Defesa agressiva, perfeccionismo ou controle para compensar sentimentos de inadequação. A pessoa age de forma oposta ao que o esquema diz sobre ela.',
      },
    ],
  },
  {
    group: 'Modos Parentais Disfuncionais',
    tone: 'parent',
    modes: [
      {
        name: 'Pai/Mãe Punitivo(a)',
        description: 'Voz interna crítica e punitiva que reprocha, envergonha e pune. Reflete a internalização de cuidadores que foram punitivos ou severos.',
      },
      {
        name: 'Pai/Mãe Exigente',
        description: 'Pressão interna contínua por performance, perfeição e padrões elevados. Impede o descanso e a auto-compaixão.',
      },
    ],
  },
  {
    group: 'Modo Adulto Saudável',
    tone: 'healthy',
    modes: [
      {
        name: 'Adulto Saudável',
        description: 'Parte funcional e equilibrada que gerencia as emoções, satisfaz necessidades de forma adaptativa, cuida da Criança Vulnerável e modera os outros modos. Objetivo central da Terapia do Esquema.',
      },
    ],
  },
]

const GROUP_ICONS = {
  child: Heart,
  coping: Shield,
  parent: Users,
  healthy: Sun,
}

const GROUP_ACCENT: Record<string, string> = {
  child: 'var(--color-brand-blue)',
  coping: 'var(--yellow)',
  parent: 'var(--red)',
  healthy: 'var(--green)',
}

export function PatientSchemaModesPage() {
  return (
    <div className="page-stack patient-portal-page">
      <PageHeader
        eyebrow="Terapia do Esquema"
        title="Modos de Esquema"
        description="Compreenda como os modos surgem e como trabalhar com eles no processo terapêutico."
        action={
          <Link to="/minha-personalidade">
            <Button variant="ghost"><ArrowLeft size={16} aria-hidden="true" /> Voltar</Button>
          </Link>
        }
      />

      <article className="panel modes-intro-panel">
        <div className="modes-intro-body">
          <BookOpen size={28} aria-hidden="true" className="modes-intro-icon" />
          <div>
            <h2>O que são modos de esquema?</h2>
            <p>
              Na Terapia do Esquema, um <strong>modo</strong> é um estado emocional e comportamental que ativamos em resposta a situações que acionam nossos esquemas. Quando um modo é ativado, passamos a sentir, pensar e agir de forma característica daquele estado. Compreender seus modos é um passo fundamental para desenvolver o <strong>Adulto Saudável</strong>.
            </p>
          </div>
        </div>
      </article>

      <section className="modes-groups-stack">
        {MODE_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.tone]
          const accent = GROUP_ACCENT[group.tone]
          return (
            <article key={group.group} className="panel modes-group-panel" style={{ '--group-accent': accent } as React.CSSProperties}>
              <div className="modes-group-header">
                <div className="modes-group-icon" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h2>{group.group}</h2>
              </div>
              <div className="modes-card-grid">
                {group.modes.map((mode) => (
                  <div key={mode.name} className="modes-card" style={{ borderLeftColor: accent }}>
                    <div className="modes-card-header">
                      <Brain size={14} aria-hidden="true" style={{ color: accent }} />
                      <strong>{mode.name}</strong>
                    </div>
                    <p>{mode.description}</p>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </section>

      <article className="panel modes-note-panel">
        <div className="modes-intro-body">
          <Smile size={24} aria-hidden="true" style={{ color: 'var(--green)', flexShrink: 0 }} />
          <p>
            <strong>Lembre-se:</strong> todos os modos têm uma função protetora — eles surgiram para nos ajudar a lidar com situações difíceis na infância. O objetivo da terapia não é eliminar esses modos, mas fortalecer o Adulto Saudável para que ele cuide dos estados internos com compaixão e eficácia.
          </p>
        </div>
      </article>
    </div>
  )
}
