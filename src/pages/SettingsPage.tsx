import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, CheckCircle2, Database, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, UserCog } from 'lucide-react'
import { Avatar } from '../components/design-system/Avatar'
import { Button } from '../components/design-system/Button'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { Badge, DataState, PageHeader } from '../components/Ui'
import { useAuth } from '../context/auth'
import { supabaseConfigError } from '../lib/supabase'
import { getSettingsData } from '../services/supabaseQueries'

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  validation: 'Em validação',
  approved: 'Aprovado',
  suspended: 'Suspenso',
  sem_status: 'Sem status',
}

const actionLabels: Record<string, string> = {
  insert: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  questionnaire_publish: 'Publicação de questionário',
  questionnaire_archive: 'Arquivamento de questionário',
  questionnaire_duplicate: 'Duplicação de questionário',
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function getSupabaseHost() {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!rawUrl) return 'Não configurado'
  try {
    return new URL(rawUrl).host
  } catch {
    return rawUrl
  }
}

function maskKey() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!key) return 'Não configurada'
  return `${key.slice(0, 8)}...${key.slice(-6)}`
}

function SettingsSection({ eyebrow, title, description, children }: {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="settings-section-block">
      <header className="settings-section-header">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </section>
  )
}

export function SettingsPage() {
  const { profile, session, refreshProfile } = useAuth()
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['settings'], queryFn: getSettingsData })

  const accessHealthy = Boolean(profile?.is_active && ['platform_admin', 'admin'].includes(profile.role))
  const configHealthy = !supabaseConfigError

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Plataforma"
        title="Configurações"
        description="Conta, ambiente, segurança e governança — sem métricas operacionais duplicadas do dashboard."
        action={
          <Button variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={16} className={isFetching ? 'spin' : undefined} aria-hidden="true" /> Atualizar
          </Button>
        }
      />

      {supabaseConfigError ? (
        <InlineNotice tone="error" message={supabaseConfigError} />
      ) : null}

      <SettingsSection eyebrow="Minha conta" title="Perfil do administrador" description="Identidade e permissões da sessão atual.">
        <div className="settings-section-grid two">
          <article className="panel settings-profile-card">
            <Avatar identity={profile} size="lg" className="settings-profile-avatar" />
            <div>
              <h3>{profile?.full_name ?? 'Administrador'}</h3>
              <p>{profile?.email ?? session?.user.email ?? 'E-mail não informado'}</p>
              <div className="badge-row">
                <Badge tone={accessHealthy ? 'success' : 'neutral'}>{profile?.role ?? 'Sem perfil'}</Badge>
                <Badge tone={profile?.is_active ? 'success' : 'neutral'}>{profile?.is_active ? 'Conta ativa' : 'Conta inativa'}</Badge>
                <Badge tone="info">Sessão: {session ? 'conectada' : 'ausente'}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={refreshProfile}>Recarregar perfil</Button>
          </article>

          <article className="panel setting-card compact">
            <UserCog size={22} aria-hidden="true" />
            <h3>Escopo de acesso</h3>
            <p>O painel é exclusivo para administradores ativos. Psicólogos e pacientes usam o aplicativo clínico.</p>
            <Badge tone={accessHealthy ? 'success' : 'warning'}>{accessHealthy ? 'Permissão válida' : 'Permissão restrita'}</Badge>
          </article>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Ambiente" title="Conexão Supabase" description="Parâmetros públicos do projeto — credenciais sensíveis nunca são exibidas.">
        <article className="panel settings-environment-card">
          <div className="setting-card-title"><Database size={22} aria-hidden="true" /><h3>Projeto conectado</h3></div>
          <div className="settings-kv"><span>Host</span><strong>{getSupabaseHost()}</strong></div>
          <div className="settings-kv"><span>Chave pública</span><strong>{maskKey()}</strong></div>
          <div className="settings-kv"><span>Status</span><Badge tone={configHealthy ? 'success' : 'danger'}>{configHealthy ? 'Configurado' : 'Incompleto'}</Badge></div>
        </article>
      </SettingsSection>

      <SettingsSection eyebrow="Segurança" title="Políticas e exposição de dados" description="Governança de acesso, RLS e tratamento de informações sensíveis.">
        <div className="settings-section-grid three">
          <article className="panel setting-card compact">
            <ShieldCheck size={22} aria-hidden="true" />
            <h3>Controle de acesso</h3>
            <p>Consultas respeitam políticas RLS do Supabase. Auditoria visível apenas para admins de plataforma.</p>
            <Badge tone="success">RLS ativo</Badge>
          </article>
          <article className="panel setting-card compact">
            <LockKeyhole size={22} aria-hidden="true" />
            <h3>Service role</h3>
            <p>Nenhuma service role, senha ou token privado é exibido neste painel.</p>
            <Badge tone="success">Exposição controlada</Badge>
          </article>
          <article className="panel setting-card compact">
            <KeyRound size={22} aria-hidden="true" />
            <h3>Dados sensíveis</h3>
            <p>A chave anônima é mascarada. Metadados de auditoria seguem política de retenção do banco.</p>
            <Badge tone="info">Chave mascarada</Badge>
          </article>
        </div>
      </SettingsSection>

      <DataState loading={isLoading} error={error} onRetry={() => refetch()}>
        <SettingsSection eyebrow="Governança" title="Questionários e saúde da base" description="Indicadores administrativos — para métricas operacionais, use Dashboard ou Relatórios.">
          <div className="settings-section-grid two">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Status clínico dos instrumentos</h3>
                  <p>Distribuição por fase do ciclo de vida.</p>
                </div>
                <CheckCircle2 size={20} aria-hidden="true" />
              </div>
              <div className="governance-list">
                {(data?.questionnaireGovernance ?? []).map((row) => (
                  <div key={row.status} className="governance-row">
                    <span>{statusLabels[row.status] ?? row.status}</span>
                    <strong>{row.count}</strong>
                  </div>
                ))}
                {!data?.questionnaireGovernance.length ? <p>Nenhum questionário cadastrado ainda.</p> : null}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Resumo da base</h3>
                  <p>Contagens agregadas para acompanhamento administrativo.</p>
                </div>
                <Activity size={20} aria-hidden="true" />
              </div>
              <div className="health-grid">
                <div><span>Admins plataforma</span><strong>{data?.totals.platformAdmins ?? 0}</strong></div>
                <div><span>Psicólogos</span><strong>{data?.totals.psychologists ?? 0}</strong></div>
                <div><span>Questionários aprovados</span><strong>{data?.totals.approvedQuestionnaires ?? 0}/{data?.totals.questionnaires ?? 0}</strong></div>
                <div><span>Clínicas ativas</span><strong>{data?.totals.activeClinics}/{data?.totals.clinics}</strong></div>
                <div><span>Pacientes ativos</span><strong>{data?.totals.activePatients}/{data?.totals.patients}</strong></div>
                <div><span>Eventos de auditoria</span><strong>{data?.totals.auditEvents ?? 0}</strong></div>
              </div>
            </article>
          </div>
        </SettingsSection>

        <SettingsSection eyebrow="Auditoria" title="Eventos recentes" description="Últimas ações sensíveis registradas — detalhe completo em Auditoria.">
          <article className="panel audit-panel">
            <div className="panel-header">
              <div>
                <h3>Trilha administrativa</h3>
                <p>Amostra das ações mais recentes no banco.</p>
              </div>
              <Badge tone="neutral">Atualizado em {formatDateTime(data?.generatedAt)}</Badge>
            </div>
            <div className="audit-list">
              {(data?.recentAuditEvents ?? []).map((event) => (
                <div key={event.id} className="audit-row">
                  <span className="audit-dot" />
                  <div>
                    <strong>{actionLabels[event.action] ?? event.action} em {event.entity_type}</strong>
                    <p>{event.actor_name}{event.clinic_name ? ` • ${event.clinic_name}` : ''}</p>
                  </div>
                  <time>{formatDateTime(event.occurred_at)}</time>
                </div>
              ))}
              {!data?.recentAuditEvents.length ? <div className="empty">Nenhum evento de auditoria encontrado.</div> : null}
            </div>
          </article>
        </SettingsSection>
      </DataState>
    </div>
  )
}
