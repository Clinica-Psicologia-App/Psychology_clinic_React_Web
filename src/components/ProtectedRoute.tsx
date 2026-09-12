import { Navigate, useLocation } from 'react-router-dom'
import { Loader2, LogOut, ShieldAlert } from 'lucide-react'
import { Button } from './Ui'
import { useAuth } from '../context/auth'
import { canAccessWebPanel, profileAccessReason } from '../lib/roleAccess'
import type { AdminProfile } from '../types'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, authError, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="center-screen">
        <Loader2 className="spin" size={32} />
        <strong>Carregando painel...</strong>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!canAccessWebPanel(profile)) {
    return (
      <main className="center-screen access-denied">
        <ShieldAlert size={42} />
        <h1>Acesso restrito</h1>
        <p>Este painel é exclusivo para administradores, psicólogos e pacientes ativos.</p>
        <div className="access-debug">
          <strong>Motivo:</strong>
          <span>{profileAccessReason(profile, authError)}</span>
          <small>Usuário autenticado: {session.user.email ?? session.user.id}</small>
          {profile ? <small>Perfil localizado: {profile.full_name} · {profile.email} · {profile.role}</small> : null}
        </div>
        <Button variant="ghost" type="button" onClick={signOut}>
          <LogOut size={18} aria-hidden="true" />
          Sair e entrar com outra conta
        </Button>
      </main>
    )
  }

  return children
}

export function RoleRoute({ children, allow, fallbackTo = '/' }: {
  children: React.ReactNode
  allow: (profile: AdminProfile | null) => boolean
  fallbackTo?: string
}) {
  const { profile } = useAuth()

  if (!allow(profile)) {
    return <Navigate to={fallbackTo} replace />
  }

  return children
}
