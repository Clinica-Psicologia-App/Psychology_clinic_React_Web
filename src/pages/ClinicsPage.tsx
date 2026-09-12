import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Edit3, Eye, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { ConfirmDialog } from '../components/design-system/ConfirmDialog'
import { FilterBar, SearchField } from '../components/design-system/FilterBar'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { DataState, PageHeader, StatusBadge } from '../components/Ui'
import { formatDate } from '../lib/format'
import { deleteClinic, listClinics, saveClinic, setClinicActive } from '../services/supabaseQueries'
import type { Clinic } from '../types'

type ClinicFormState = {
  id?: string
  name: string
  clinic_type: string
  document: string
  email: string
  phone: string
}

const emptyClinic: ClinicFormState = {
  name: '',
  clinic_type: 'clinic',
  document: '',
  email: '',
  phone: '',
}

function toForm(clinic: Clinic): ClinicFormState {
  return {
    id: clinic.id,
    name: clinic.name,
    clinic_type: clinic.clinic_type ?? 'clinic',
    document: clinic.document ?? '',
    email: clinic.email ?? '',
    phone: clinic.phone ?? '',
  }
}

export function ClinicsPage() {
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<ClinicFormState | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Clinic | null>(null)
  const queryClient = useQueryClient()
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['clinics'], queryFn: listClinics })

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['clinics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: saveClinic,
    onSuccess: async () => {
      setForm(null)
      setMessage({ tone: 'success', text: 'Clínica salva com sucesso.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setClinicActive(id, active),
    onSuccess: async () => {
      setMessage({ tone: 'success', text: 'Status da clínica atualizado.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => deleteClinic(id, name),
    onSuccess: async () => {
      setDeleteTarget(null)
      setMessage({ tone: 'success', text: 'Clínica excluída com sucesso.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const filtered = useMemo(
    () => data.filter((clinic) => `${clinic.name} ${clinic.document ?? ''} ${clinic.email ?? ''}`.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  )

  function submitClinic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form?.name.trim()) return
    saveMutation.mutate(form)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Organização"
        title="Clínicas"
        description="Cadastro, status e operação das contas clínicas conectadas ao app."
        action={<Button variant="primary" onClick={() => setForm(emptyClinic)}><Plus size={16} aria-hidden="true" /> Nova clínica</Button>}
      />

      {message ? (
        <InlineNotice
          tone={message.tone}
          message={message.text}
          onDismiss={() => setMessage(null)}
          autoDismissMs={message.tone === 'success' ? 5000 : undefined}
        />
      ) : null}

      <FilterBar resultCount={filtered.length} resultLabel="clínicas">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar por nome, documento ou e-mail" />
      </FilterBar>

      <DataState loading={isLoading} error={error} onRetry={() => refetch()}>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Clínica</th>
                <th>Tipo</th>
                <th>Contato</th>
                <th>Usuários</th>
                <th>Pacientes</th>
                <th>Status</th>
                <th>Criada em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((clinic) => (
                <tr key={clinic.id}>
                  <td>
                    <div className="table-person">
                      <span><Building2 size={16} aria-hidden="true" /></span>
                      <div>
                        <strong>{clinic.name}</strong>
                        <small>{clinic.document || 'Sem documento'}</small>
                      </div>
                    </div>
                  </td>
                  <td>{clinic.clinic_type === 'personal' ? 'Individual' : 'Clínica'}</td>
                  <td><small>{clinic.email || 'Sem e-mail'}</small><small>{clinic.phone || 'Sem telefone'}</small></td>
                  <td>{clinic.user_count ?? 0}</td>
                  <td>{clinic.patient_count ?? 0}</td>
                  <td><StatusBadge active={clinic.is_active} /></td>
                  <td>{formatDate(clinic.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/clinicas/${clinic.id}`}><Button variant="ghost" size="icon" title="Ver detalhe"><Eye size={16} /></Button></Link>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => setForm(toForm(clinic))}><Edit3 size={16} /></Button>
                      <Button variant="ghost" size="icon" title={clinic.is_active ? 'Inativar' : 'Ativar'} onClick={() => activeMutation.mutate({ id: clinic.id, active: !clinic.is_active })} disabled={activeMutation.isPending}>
                        {clinic.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                      </Button>
                      <Button variant="danger" size="icon" title="Excluir" onClick={() => setDeleteTarget(clinic)}><Trash2 size={16} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <div className="empty">Nenhuma clínica encontrada.</div> : null}
        </div>
      </DataState>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir clínica"
        description={deleteTarget ? `A clínica "${deleteTarget.name}" será excluída definitivamente. Vínculos existentes podem impedir a operação conforme regras do backend.` : ''}
        confirmLabel="Excluir definitivamente"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, name: deleteTarget.name })}
      />

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <form className="modal-card" onSubmit={submitClinic} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>{form.id ? 'Editar clínica' : 'Nova clínica'}</h2>
              <p>Os dados são gravados diretamente em clinics no Supabase.</p>
            </header>
            <label>Nome<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label>Tipo<select value={form.clinic_type} onChange={(event) => setForm({ ...form, clinic_type: event.target.value })}><option value="clinic">Clínica</option><option value="personal">Individual</option></select></label>
            <label>Documento<input value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} /></label>
            <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <footer>
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar clínica'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}
