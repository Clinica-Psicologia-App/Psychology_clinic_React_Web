import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Brain,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  Heart,
  Layers3,
  LayoutDashboard,
  LogOut,
  MailPlus,
  Menu,
  Search,
  Settings,
  Users,
  UserRoundCheck,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/auth'
import { useEntitlements } from '../context/entitlements'
import { Avatar } from './design-system/Avatar'
import { Button } from './design-system/Button'
import esquemaCoreIcon from '../assets/esquema-core-icon.png'
import { canAccessAdminPanel, isPlatformAdminScope } from '../lib/roleAccess'
import { OnboardingTour, useOnboardingTour } from './OnboardingTour'
import type { AdminProfile } from '../types'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  feature?: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

function buildNavGroups(profile: AdminProfile | null): NavGroup[] {
  const platformScope = isPlatformAdminScope(profile)
  if (profile?.role === 'psychologist') {
    return [
      {
        label: 'Área clínica',
        items: [
          { to: '/pacientes', label: 'Pacientes', icon: UserRoundCheck, feature: 'patients' },
          { to: '/convites', label: 'Convites', icon: MailPlus, feature: 'patients' },
          { to: '/recursos-terapeuticos', label: 'Recursos', icon: BookOpenCheck, feature: 'resources' },
          { to: '/psicoeducacao', label: 'Psicoeducação', icon: BookOpenCheck, feature: 'psychoeducation' },
        ],
      },
    ]
  }

  if (profile?.role === 'patient') {
    return [
      {
        label: 'Minha área',
        items: [
          { to: '/minha-avaliacao-inicial', label: 'Avaliação inicial', icon: ClipboardCheck },
          { to: '/meus-questionarios', label: 'Questionários', icon: ClipboardList, feature: 'questionnaires' },
          { to: '/meu-acompanhamento', label: 'Acompanhamento', icon: Activity },
          { to: '/meus-recursos', label: 'Recursos', icon: BookOpenCheck, feature: 'resources' },
          { to: '/minha-biblioteca', label: 'Biblioteca', icon: BookOpenCheck, feature: 'library' },
          { to: '/minha-psicoeducacao', label: 'Psicoeducação', icon: BookOpenCheck, feature: 'psychoeducation' },
          { to: '/minha-linha-do-tempo', label: 'Linha do tempo', icon: CalendarDays },
          { to: '/minha-familia', label: 'Minha família', icon: Heart, feature: 'genogram' },
          { to: '/meu-genograma', label: 'Genograma', icon: Users, feature: 'genogram' },
          { to: '/minha-personalidade', label: 'Personalidade', icon: Brain, feature: 'personality' },
          { to: '/meus-resultados', label: 'Meus resultados', icon: ClipboardList, feature: 'questionnaires' },
        ],
      },
    ]
  }

  if (!canAccessAdminPanel(profile)) return []

  return [
  {
    label: 'Operação',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/clinicas', label: 'Clínicas', icon: Building2 },
      { to: '/usuarios', label: 'Usuários', icon: Users },
      platformScope
        ? { to: '/visao-pacientes', label: 'Visão pacientes', icon: UserRoundCheck }
        : { to: '/pacientes', label: 'Pacientes', icon: UserRoundCheck, feature: 'patients' },
      ...(!platformScope ? [{ to: '/convites', label: 'Convites', icon: MailPlus, feature: 'patients' }] : []),
      ...(!platformScope ? [{ to: '/recursos-terapeuticos', label: 'Recursos', icon: BookOpenCheck, feature: 'resources' }] : []),
    ],
  },
  {
    label: 'Governança clínica',
    items: [
      { to: '/questionarios', label: 'Questionários', icon: ClipboardList, feature: 'questionnaires' },
      { to: '/acesso-questionarios', label: 'Acesso', icon: ClipboardCheck, feature: 'questionnaires' },
      { to: '/biblioteca', label: 'Biblioteca', icon: BookOpenCheck, feature: 'library' },
      { to: '/psicoeducacao-admin', label: 'Psicoeducação', icon: BookOpenCheck, feature: 'psychoeducation' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/relatorios', label: 'Relatórios', icon: BarChart3, feature: 'reports' },
      { to: '/planos', label: 'Planos', icon: Layers3 },
    ],
  },
  {
    label: 'Administração',
    items: [
      { to: '/auditoria', label: 'Auditoria', icon: FileSearch },
      { to: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
  ]
}

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/clinicas': 'Clínicas',
  '/usuarios': 'Usuários',
  '/visao-pacientes': 'Visão agregada de pacientes',
  '/minha-avaliacao-inicial': 'Minha avaliação inicial',
  '/meus-questionarios': 'Meus questionários',
  '/meu-acompanhamento': 'Meu acompanhamento',
  '/meus-recursos': 'Meus recursos',
  '/minha-biblioteca': 'Minha biblioteca',
  '/minha-psicoeducacao': 'Minha psicoeducação',
  '/meu-genograma': 'Meu genograma',
  '/minha-personalidade': 'Minha personalidade',
  '/meus-resultados': 'Meus resultados',
  '/convites': 'Convites de pacientes',
  '/recursos-terapeuticos': 'Recursos terapêuticos',
  '/psicoeducacao': 'Psicoeducação',
  '/pacientes': 'Pacientes',
  '/questionarios': 'Questionários',
  '/acesso-questionarios': 'Acesso aos questionários',
  '/biblioteca': 'Biblioteca cinematográfica',
  '/psicoeducacao-admin': 'Psicoeducação admin',
  '/relatorios': 'Relatórios',
  '/planos': 'Planos',
  '/auditoria': 'Auditoria',
  '/configuracoes': 'Configurações',
  '/minha-linha-do-tempo': 'Minha linha do tempo',
  '/minha-familia': 'Minha família',
  '/referencias-modos': 'Modos do esquema',
  '/perfil': 'Meu perfil',
  '/biblioteca-clinica': 'Biblioteca clínica',
}

function getRouteLabel(pathname: string) {
  const exact = routeLabels[pathname]
  if (exact) return exact
  const parent = Object.keys(routeLabels)
    .filter((path) => path !== '/' && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0]
  return parent ? `Detalhe de ${routeLabels[parent].toLowerCase()}` : 'Painel'
}

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const { isFeatureEnabled } = useEntitlements()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const routeLabel = getRouteLabel(location.pathname)
  const navGroups = buildNavGroups(profile)
  const tour = useOnboardingTour(profile?.role ?? 'admin')
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isFeatureEnabled(item.feature)),
    }))
    .filter((group) => group.items.length)

  return (
    <div className="app-shell">
      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside className={clsx('sidebar', mobileOpen && 'open')}>
        <div className="sidebar-brand">
          <img src={esquemaCoreIcon} alt="" width={40} height={40} />
          <div>
            <strong>EsquemaCore</strong>
            <span>{profile?.role === 'psychologist' ? 'Painel clínico' : profile?.role === 'patient' ? 'Área do paciente' : 'Painel administrativo'}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navGroups.map((group) => (
            <div key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              <div className="nav-list">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => clsx('nav-link', isActive && 'active')}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link to="/perfil" className="profile-chip profile-chip-link">
            <Avatar identity={profile} size="md" />
            <div>
              <strong>{profile?.full_name ?? 'Administrador'}</strong>
              <span>{profile?.email}</span>
            </div>
          </Link>
          <Button variant="ghost" fullWidth onClick={signOut}>
            <LogOut size={18} aria-hidden="true" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="workspace-shell">
        <header className="workspace-topbar">
          <div className="workspace-context">
            <Button
              variant="ghost"
              size="icon"
              className="sidebar-mobile-toggle"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
            <div>
              <span>EsquemaCore</span>
              <strong>{routeLabel}</strong>
            </div>
          </div>

          <div className="workspace-tools">
            <div className="workspace-status" title="Conexão operacional ativa">
              <i aria-hidden="true" />
              Operação online
            </div>
            <div className="workspace-search-hint" aria-hidden="true">
              <Search size={15} />
              <span>Navegue pelo menu</span>
            </div>
            <Avatar identity={profile} size="sm" className="workspace-avatar" title={profile?.full_name ?? 'Administrador'} />
          </div>
        </header>

        <main className="content-area">
          <div className="route-stage" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>

      {tour.open && profile ? (
        <OnboardingTour role={profile.role} onDismiss={tour.dismiss} />
      ) : null}
    </div>
  )
}
