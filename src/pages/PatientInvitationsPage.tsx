import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Copy, MailPlus, Send, UserRoundCheck } from 'lucide-react'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { FilterBar, FilterSelect, SearchField } from '../components/design-system/FilterBar'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { useAuth } from '../context/auth'
import { formatDate } from '../lib/format'
import { canManagePatientInvitations } from '../lib/roleAccess'
import { createPatientInvitation, listPatientInvitations, listUsers } from '../services/supabaseQueries'
import type { PatientInvitation, UserProfile } from '../types'

type InvitationFormState = {
  email: string
  full_name: string
  phone: string
  responsible_psychologist_id: string
}

type NoticeState = {
  tone: 'success' | 'error' | 'warning'
  text: string
  inviteUrl?: string
}

const emptyForm: InvitationFormState = {
  email: '',
  full_name: '',
  phone: '',
  responsible_psychologist_id: '',
}

function statusLabel(status: PatientInvitation['status']) {
  const labels = {
    pending: 'Pendente',
    accepted: 'Aceito',
    expired: 'Expirado',
    revoked: 'Revogado',
  }
  return labels[status] ?? status
}

function statusTone(status: PatientInvitation['status']) {
  if (status === 'pending') return 'warning' as const
  if (status === 'accepted') return 'success' as const
  if (status === 'revoked') return 'danger' as const
  return 'neutral' as const
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function appInviteUrl(inviteUrl?: string) {
  if (!inviteUrl) return ''
  if (/^https?:\/\//i.test(inviteUrl)) return inviteUrl
  return `${window.location.origin}${inviteUrl.startsWith('/') ? inviteUrl : `/${inviteUrl}`}`
}

export function PatientInvitationsPage() {
  const { profile } = useAuth()
  const canManageInvitations = canManagePatientInvitations(profile)
  const psychologistScope = profile?.role === 'psychologist'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState<InvitationFormState | null>(null)
  const [message, setMessage] = useState<NoticeState | null>(null)
  const queryClient = useQueryClient()

  const invitations = useQuery({ queryKey: ['patient-invitations'], queryFn: listPatientInvitations, enabled: canManageInvitations })
  const users = useQuery({ queryKey: ['users'], queryFn: listUsers, enabled: canManageInvitations && !psychologistScope })

  const psychologists = useMemo(
    () => {
      if (psychologistScope && profile) {
        return [{
          id: profile.id,
          clinic_id: profile.clinic_id,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          is_active: profile.is_active,
          created_at: '',
          clinic: profile.clinic ?? null,
        } satisfies UserProfile]
      }

      return (users.data ?? []).filter((user) => user.role === 'psychologist' && user.is_active && user.clinic_id === profile?.clinic_id)
    },
    [profile, psychologistScope, users.data],
  )

  const filtered = useMemo(() => (invitations.data ?? []).filter((invitation) => {
    const haystack = `${invitation.email} ${invitation.full_name ?? ''} ${invitation.phone ?? ''} ${invitation.responsible_psychologist_profile?.full_name ?? ''}`.toLowerCase()
    if (search && !haystack.includes(search.toLowerCase())) return false
    if (statusFilter && invitation.status !== statusFilter) return false
    return true
  }), [invitations.data, search, statusFilter])

  const totals = useMemo(() => {
    const rows = invitations.data ?? []
    return {
      total: rows.length,
      pending: rows.filter((invitation) => invitation.status === 'pending').length,
      accepted: rows.filter((invitation) => invitation.status === 'accepted').length,
      expiring: rows.filter((invitation) => invitation.status === 'pending' && new Date(invitation.expires_at).getTime() - Date.now() <= 3 * 24 * 60 * 60 * 1000).length,
    }
  }, [invitations.data])

  const createMutation = useMutation({
    mutationFn: createPatientInvitation,
    onSuccess: async (created) => {
      setForm(null)
      setMessage({ tone: 'success', text: 'Convite criado com sucesso. Copie o link para enviar ao paciente.', inviteUrl: appInviteUrl(created.invite_url) })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patient-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-executive'] }),
      ])
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setMessage({ tone: 'success', text: 'Link do convite copiado.', inviteUrl: url })
    } catch {
      setMessage({ tone: 'warning', text: 'Não consegui copiar automaticamente. Selecione o link abaixo manualmente.', inviteUrl: url })
    }
  }

  function openCreate() {
    setForm({ ...emptyForm, responsible_psychologist_id: psychologistScope ? profile?.id ?? '' : psychologists[0]?.id ?? '' })
  }

  function submitInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form?.email.trim() || !form.responsible_psychologist_id) return
    createMutation.mutate(form)
  }

  if (!canManageInvitations) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Convites"
          title="Convites de pacientes"
          description="A criação de convites exige um administrador ou psicólogo vinculado a uma clínica."
        />
        <EmptyState
          icon={MailPlus}
          title="Convites indisponíveis neste escopo"
          description="Administradores de plataforma acompanham pacientes por dados agregados. Para convidar pacientes, use um perfil de clínica."
        />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Primeiro acesso"
        title="Convites de pacientes"
        description="Crie convites mínimos para o paciente definir senha e completar o próprio cadastro no app."
        action={<Button variant="primary" onClick={openCreate}><MailPlus size={16} aria-hidden="true" /> Novo convite</Button>}
      />

      {message ? (
        <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' && !message.inviteUrl ? 5000 : undefined} />
      ) : null}

      {message?.inviteUrl ? (
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Link do convite</span>
              <h2>Envie ao paciente por um canal seguro</h2>
              <p>{message.inviteUrl}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => message.inviteUrl && copyInviteUrl(message.inviteUrl)}>
              <Copy size={16} aria-hidden="true" /> Copiar
            </Button>
          </div>
        </article>
      ) : null}

      <DataState loading={invitations.isLoading || users.isLoading} error={invitations.error || users.error} onRetry={() => { invitations.refetch(); users.refetch() }}>
        <section className="stats-grid four">
          <StatCard label="Convites" value={totals.total} icon={MailPlus} />
          <StatCard label="Pendentes" value={totals.pending} icon={CalendarClock} tone="warning" />
          <StatCard label="Aceitos" value={totals.accepted} icon={UserRoundCheck} tone="blue" />
          <StatCard label="Expiram em até 3 dias" value={totals.expiring} icon={Send} tone="navy" />
        </section>

        <FilterBar resultCount={filtered.length} resultLabel="convites">
          <SearchField value={search} onChange={setSearch} placeholder="Buscar por paciente, e-mail, telefone ou psicólogo" />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} label="Filtrar por status">
            <option value="">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="accepted">Aceitos</option>
            <option value="expired">Expirados</option>
            <option value="revoked">Revogados</option>
          </FilterSelect>
        </FilterBar>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Paciente convidado</th>
                <th>Psicólogo responsável</th>
                <th>Status</th>
                <th>Expira em</th>
                <th>Criado em</th>
                <th>Aceito em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invitation) => (
                <tr key={invitation.id}>
                  <td>
                    <strong>{invitation.full_name || 'Nome não informado'}</strong>
                    <small>{invitation.email}{invitation.phone ? ` · ${invitation.phone}` : ''}</small>
                  </td>
                  <td>{invitation.responsible_psychologist_profile?.full_name ?? 'Psicólogo não localizado'}</td>
                  <td><Badge tone={statusTone(invitation.status)}>{statusLabel(invitation.status)}</Badge></td>
                  <td>{formatDate(invitation.expires_at)}</td>
                  <td>{formatDateTime(invitation.created_at)}</td>
                  <td>{invitation.accepted_at ? formatDateTime(invitation.accepted_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <div className="empty">Nenhum convite encontrado.</div> : null}
        </div>
      </DataState>

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card" onSubmit={submitInvitation} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>Novo convite</h2>
              <p>O paciente receberá um link para criar a senha e finalizar o primeiro acesso.</p>
            </header>
            <label>Nome do paciente<input autoFocus value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
            <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
            <label>Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>Psicólogo responsável<select value={form.responsible_psychologist_id} onChange={(event) => setForm({ ...form, responsible_psychologist_id: event.target.value })} required disabled={psychologistScope}><option value="">Selecione</option>{psychologists.map((psychologist) => <option key={psychologist.id} value={psychologist.id}>{psychologist.full_name}</option>)}</select></label>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={createMutation.isPending || !psychologists.length}>{createMutation.isPending ? 'Criando...' : 'Criar convite'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}
