import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Eye, Plus, Power, PowerOff, SlidersHorizontal, Trash2, UserCog } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { CapacityCell } from '../components/design-system/CapacityCell'
import { ConfirmDialog } from '../components/design-system/ConfirmDialog'
import { FilterBar, SearchField } from '../components/design-system/FilterBar'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { DataState, PageHeader, RoleBadge, StatusBadge } from '../components/Ui'
import { formatDate } from '../lib/format'
import { createUser, deleteUser, listClinics, listUsers, setUserActive, updatePsychologistAccess, updateUser } from '../services/supabaseQueries'
import type { ProfileRole, UserProfile } from '../types'

type UserFormState = {
  id?: string
  full_name: string
  email: string
  password: string
  phone: string
  crp: string
  role: ProfileRole
  clinic_id: string
}

type AccessFormState = {
  id: string
  name: string
  can_receive_patients: boolean
  patient_assignment_limit: string
}

type NoticeState = { tone: 'success' | 'error' | 'warning'; text: string }

const emptyUser: UserFormState = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  crp: '',
  role: 'psychologist',
  clinic_id: '',
}

function toForm(user: UserProfile): UserFormState {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    password: '',
    phone: user.phone ?? '',
    crp: user.crp ?? '',
    role: user.role,
    clinic_id: user.clinic_id ?? '',
  }
}

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<UserFormState | null>(null)
  const [accessForm, setAccessForm] = useState<AccessFormState | null>(null)
  const [message, setMessage] = useState<NoticeState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const queryClient = useQueryClient()
  const users = useQuery({ queryKey: ['users'], queryFn: listUsers })
  const clinics = useQuery({ queryKey: ['clinics'], queryFn: listClinics })
  const clinicById = useMemo(() => new Map((clinics.data ?? []).map((clinic) => [clinic.id, clinic.name])), [clinics.data])

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['clinics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: (input: UserFormState) => input.id ? updateUser({ ...input, id: input.id }) : createUser(input),
    onSuccess: async () => {
      setForm(null)
      setMessage({ tone: 'success', text: 'Usuário salvo com sucesso.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active),
    onSuccess: async () => {
      setMessage({ tone: 'success', text: 'Status do usuário atualizado.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const accessMutation = useMutation({
    mutationFn: (input: AccessFormState) => updatePsychologistAccess(input.id, input.can_receive_patients, input.patient_assignment_limit.trim() === '' ? null : Number(input.patient_assignment_limit)),
    onSuccess: async () => {
      setAccessForm(null)
      setMessage({ tone: 'success', text: 'Acesso do psicólogo atualizado.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      setDeleteTarget(null)
      setMessage({ tone: 'success', text: 'Usuário excluído com sucesso.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const filtered = useMemo(
    () => (users.data ?? []).filter((user) => `${user.full_name} ${user.email} ${user.role} ${clinicById.get(user.clinic_id ?? '') ?? ''}`.toLowerCase().includes(search.toLowerCase())),
    [users.data, search, clinicById],
  )

  function openCreate() {
    setForm({ ...emptyUser, clinic_id: clinics.data?.[0]?.id ?? '' })
  }

  function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form?.full_name.trim() || !form.email.trim() || !form.clinic_id) return
    if (!form.id && form.password.length < 8) {
      setMessage({ tone: 'warning', text: 'A senha inicial precisa ter pelo menos 8 caracteres.' })
      return
    }
    saveMutation.mutate(form)
  }

  function requestDelete(user: UserProfile) {
    if (user.is_active) {
      setMessage({ tone: 'warning', text: 'Por segurança, inative o usuário antes de excluir definitivamente.' })
      return
    }
    setDeleteTarget(user)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Acessos"
        title="Usuários"
        description="Administradores e psicólogos — perfil, clínica, capacidade e status."
        action={<Button variant="primary" onClick={openCreate}><Plus size={16} aria-hidden="true" /> Novo usuário</Button>}
      />

      {message ? (
        <InlineNotice
          tone={message.tone}
          message={message.text}
          onDismiss={() => setMessage(null)}
          autoDismissMs={message.tone === 'success' ? 5000 : undefined}
        />
      ) : null}

      <FilterBar resultCount={filtered.length} resultLabel="usuários">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar por nome, e-mail, perfil ou clínica" />
      </FilterBar>

      <DataState loading={users.isLoading || clinics.isLoading} error={users.error || clinics.error} onRetry={() => { users.refetch(); clinics.refetch() }}>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Clínica</th>
                <th>Capacidade</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const assigned = user.assigned_patients_count ?? 0
                const pending = user.pending_patient_invitations_count ?? 0
                const used = assigned + pending
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="table-person">
                        <span><UserCog size={16} aria-hidden="true" /></span>
                        <div><strong>{user.full_name}</strong><small>{user.email}</small></div>
                      </div>
                    </td>
                    <td><RoleBadge role={user.role} /></td>
                    <td>{user.clinic_id ? clinicById.get(user.clinic_id) ?? user.clinic?.name ?? 'Clínica não encontrada' : 'Sem clínica'}</td>
                    <td>
                      {user.role === 'psychologist' ? (
                        <CapacityCell used={used} limit={user.patient_assignment_limit} canReceive={user.can_receive_patients !== false} />
                      ) : (
                        <small>—</small>
                      )}
                    </td>
                    <td><StatusBadge active={user.is_active} /></td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        {user.role === 'psychologist' ? (
                          <Link to={`/usuarios/${user.id}`}><Button variant="ghost" size="icon" title="Ver detalhe"><Eye size={16} /></Button></Link>
                        ) : null}
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => setForm(toForm(user))}><Edit3 size={16} /></Button>
                        <Button variant="ghost" size="icon" title={user.is_active ? 'Inativar' : 'Ativar'} disabled={activeMutation.isPending} onClick={() => activeMutation.mutate({ id: user.id, active: !user.is_active })}>
                          {user.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                        </Button>
                        {user.role === 'psychologist' ? (
                          <Button variant="ghost" size="sm" title="Controle de capacidade" onClick={() => setAccessForm({ id: user.id, name: user.full_name, can_receive_patients: user.can_receive_patients ?? true, patient_assignment_limit: user.patient_assignment_limit?.toString() ?? '' })}>
                            <SlidersHorizontal size={14} aria-hidden="true" /> Limite
                          </Button>
                        ) : null}
                        <Button variant="danger" size="icon" title="Excluir" onClick={() => requestDelete(user)}><Trash2 size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length ? <div className="empty">Nenhum usuário encontrado.</div> : null}
        </div>
      </DataState>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir usuário"
        description={deleteTarget ? `O usuário "${deleteTarget.full_name}" será removido definitivamente do sistema.` : ''}
        confirmLabel="Excluir definitivamente"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card" onSubmit={submitUser} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header><h2>{form.id ? 'Editar usuário' : 'Novo usuário'}</h2><p>{form.id ? 'Atualiza o perfil em profiles.' : 'Cria auth.users e profiles pela Edge Function create-staff-user.'}</p></header>
            <label>Nome completo<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required /></label>
            <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
            {!form.id ? <label>Senha inicial<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={8} /></label> : null}
            <label>Clínica<select value={form.clinic_id} onChange={(event) => setForm({ ...form, clinic_id: event.target.value })} required><option value="">Selecione</option>{(clinics.data ?? []).map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}</select></label>
            <label>Perfil<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as ProfileRole })}><option value="psychologist">Psicólogo</option><option value="platform_admin">Administrador</option></select></label>
            <label>Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            {form.role === 'psychologist' ? <label>CRP<input value={form.crp} onChange={(event) => setForm({ ...form, crp: event.target.value })} /></label> : null}
            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar usuário'}</Button>
            </footer>
          </form>
        </div>
      ) : null}

      {accessForm ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setAccessForm(null)}>
          <form className="modal-card" onSubmit={(event) => { event.preventDefault(); accessMutation.mutate(accessForm) }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header><h2>Controle de capacidade</h2><p>{accessForm.name}</p></header>
            <label className="check-row"><input type="checkbox" checked={accessForm.can_receive_patients} onChange={(event) => setAccessForm({ ...accessForm, can_receive_patients: event.target.checked })} /> Pode receber novos pacientes</label>
            <label>Limite de pacientes/convites<input type="number" min="0" value={accessForm.patient_assignment_limit} onChange={(event) => setAccessForm({ ...accessForm, patient_assignment_limit: event.target.value })} placeholder="Vazio = sem limite" /></label>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setAccessForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={accessMutation.isPending}>{accessMutation.isPending ? 'Salvando...' : 'Salvar limite'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}
