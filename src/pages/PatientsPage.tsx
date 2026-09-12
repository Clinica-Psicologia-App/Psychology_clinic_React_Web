import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, ArrowRight, BellRing, Check, Clock3, Edit3, Eye, Plus, Power, PowerOff, ShieldCheck, Trash2, UserRoundCheck } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { ConfirmDialog } from '../components/design-system/ConfirmDialog'
import { FilterBar, FilterSelect, SearchField } from '../components/design-system/FilterBar'
import { FormSection } from '../components/design-system/FormSection'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { Badge, DataState, PageHeader, StatusBadge } from '../components/Ui'
import { formatDate } from '../lib/format'
import { createPatient, deletePatient, listClinics, listPatients, listPatientsDataCompletion, listPsychologistAlerts, listUsers, setPatientActive, updatePatient } from '../services/supabaseQueries'
import { useAuth } from '../context/auth'
import { isPlatformAdminScope } from '../lib/roleAccess'
import type { ClinicalAlertSeverity, Patient, PatientDataCompletionRow, PsychologistAlertKind, PsychologistAlertRow, UserProfile } from '../types'

type PatientFormState = {
  id?: string
  full_name: string
  email: string
  password: string
  phone: string
  cpf: string
  birth_date: string
  gender: string
  relationship_status: string
  education_level: string
  occupation: string
  country_birth: string
  state_birth: string
  religious_orientation: string
  ethnic_group: string
  sexual_orientation: string
  has_children: string
  responsible_psychologist_id: string
}

type NoticeState = { tone: 'success' | 'error' | 'warning'; text: string }

const emptyPatient: PatientFormState = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  cpf: '',
  birth_date: '',
  gender: '',
  relationship_status: '',
  education_level: '',
  occupation: '',
  country_birth: '',
  state_birth: '',
  religious_orientation: '',
  ethnic_group: '',
  sexual_orientation: '',
  has_children: '',
  responsible_psychologist_id: '',
}

function toForm(patient: Patient): PatientFormState {
  return {
    id: patient.id,
    full_name: patient.full_name,
    email: patient.email ?? '',
    password: '',
    phone: patient.phone ?? '',
    cpf: patient.cpf ?? '',
    birth_date: patient.birth_date?.slice(0, 10) ?? '',
    gender: patient.gender ?? '',
    relationship_status: patient.relationship_status ?? '',
    education_level: patient.education_level ?? '',
    occupation: patient.occupation ?? '',
    country_birth: patient.country_birth ?? '',
    state_birth: patient.state_birth ?? '',
    religious_orientation: patient.religious_orientation ?? '',
    ethnic_group: patient.ethnic_group ?? '',
    sexual_orientation: patient.sexual_orientation ?? '',
    has_children: patient.has_children == null ? '' : patient.has_children ? 'true' : 'false',
    responsible_psychologist_id: patient.responsible_psychologist_id ?? '',
  }
}

function hasChildrenValue(value: string) {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function fallbackCompletion(patient: Patient): PatientDataCompletionRow {
  const fields = [
    patient.full_name,
    patient.email,
    patient.phone,
    patient.cpf,
    patient.birth_date,
    patient.gender,
    patient.relationship_status,
    patient.education_level,
    patient.occupation,
    patient.profile_id,
    patient.responsible_psychologist_id,
  ]
  const completed = fields.filter(Boolean).length
  return {
    patient_id: patient.id,
    completed_fields: completed,
    total_fields: fields.length,
    completion_rate: Math.round((completed / fields.length) * 100),
    missing_fields: null,
  }
}

function alertKindLabel(kind: PsychologistAlertKind) {
  const labels: Record<string, string> = {
    expiringInvitation: 'Convite',
    staleQuestionnaire: 'Questionário',
    missingCheckin: 'Check-in',
    pendingResultsRelease: 'Resultado',
  }
  return labels[kind] ?? 'Alerta'
}

function alertTone(severity: ClinicalAlertSeverity): 'danger' | 'warning' | 'info' | 'success' {
  return severity
}

export function PatientsPage() {
  const { profile } = useAuth()
  const platformScope = isPlatformAdminScope(profile)
  const psychologistScope = profile?.role === 'psychologist'
  const [search, setSearch] = useState('')
  const [clinicFilter, setClinicFilter] = useState('')
  const [psychologistFilter, setPsychologistFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState<PatientFormState | null>(null)
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1)
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState<NoticeState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)
  const queryClient = useQueryClient()

  const patients = useQuery({ queryKey: ['patients'], queryFn: listPatients, enabled: !platformScope })
  const clinics = useQuery({ queryKey: ['clinics'], queryFn: listClinics, enabled: !platformScope && !psychologistScope })
  const users = useQuery({ queryKey: ['users'], queryFn: listUsers, enabled: !platformScope && !psychologistScope })
  const clinicalAlerts = useQuery({ queryKey: ['psychologist-alerts'], queryFn: listPsychologistAlerts, enabled: !platformScope })
  const dataCompletion = useQuery({ queryKey: ['patients-data-completion'], queryFn: listPatientsDataCompletion, enabled: !platformScope })

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
      return (users.data ?? []).filter((user) => user.role === 'psychologist')
    },
    [profile, psychologistScope, users.data],
  )
  const clinicById = useMemo(() => new Map((clinics.data ?? []).map((clinic) => [clinic.id, clinic.name])), [clinics.data])
  const psychologistById = useMemo(() => new Map(psychologists.map((user) => [user.id, user])), [psychologists])
  const alertsByPatient = useMemo(() => {
    const map = new Map<string, PsychologistAlertRow[]>()
    for (const alert of clinicalAlerts.data ?? []) {
      if (!alert.patient_id) continue
      map.set(alert.patient_id, [...(map.get(alert.patient_id) ?? []), alert])
    }
    return map
  }, [clinicalAlerts.data])
  const completionByPatient = useMemo(() => {
    const map = new Map<string, PatientDataCompletionRow>()
    for (const row of dataCompletion.data ?? []) {
      map.set(row.patient_id, row)
    }
    for (const patient of patients.data ?? []) {
      if (!map.has(patient.id)) map.set(patient.id, fallbackCompletion(patient))
    }
    return map
  }, [dataCompletion.data, patients.data])
  const attentionSummary = useMemo(() => {
    const alerts = clinicalAlerts.data ?? []
    const urgentAlerts = alerts.filter((alert) => alert.severity === 'danger' || alert.severity === 'warning')
    const incompletePatients = (patients.data ?? []).filter((patient) => (completionByPatient.get(patient.id)?.completion_rate ?? 100) < 70)
    const withoutApp = (patients.data ?? []).filter((patient) => !patient.profile_id)
    return { alerts, urgentAlerts, incompletePatients, withoutApp }
  }, [clinicalAlerts.data, completionByPatient, patients.data])

  const activeFilterCount = [clinicFilter, psychologistFilter, statusFilter].filter(Boolean).length

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['patients'] }),
      queryClient.invalidateQueries({ queryKey: ['clinics'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: (input: PatientFormState) => input.id
      ? updatePatient({
          id: input.id,
          full_name: input.full_name,
          phone: input.phone,
          birth_date: input.birth_date,
          gender: input.gender,
          relationship_status: input.relationship_status,
          education_level: input.education_level,
          occupation: input.occupation,
          country_birth: input.country_birth,
          state_birth: input.state_birth,
          religious_orientation: input.religious_orientation,
          ethnic_group: input.ethnic_group,
          sexual_orientation: input.sexual_orientation,
          has_children: hasChildrenValue(input.has_children),
          responsible_psychologist_id: input.responsible_psychologist_id,
        })
      : createPatient({
          full_name: input.full_name,
          email: input.email,
          password: input.password,
          responsible_psychologist_id: input.responsible_psychologist_id,
          phone: input.phone,
          cpf: input.cpf,
          birth_date: input.birth_date,
          gender: input.gender,
          relationship_status: input.relationship_status,
          education_level: input.education_level,
          occupation: input.occupation,
          country_birth: input.country_birth,
          state_birth: input.state_birth,
          religious_orientation: input.religious_orientation,
          ethnic_group: input.ethnic_group,
          sexual_orientation: input.sexual_orientation,
          has_children: hasChildrenValue(input.has_children),
        }),
    onSuccess: async () => {
      setForm(null)
      setMessage({ tone: 'success', text: 'Paciente salvo com sucesso.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setPatientActive(id, active),
    onSuccess: async () => {
      setMessage({ tone: 'success', text: 'Status do paciente atualizado.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: async () => {
      setDeleteTarget(null)
      setMessage({ tone: 'success', text: 'Paciente excluído definitivamente.' })
      await invalidate()
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  const filtered = useMemo(
    () => (patients.data ?? []).filter((patient) => {
      const psychologist = psychologistById.get(patient.responsible_psychologist_id ?? '')
      const haystack = `${patient.full_name} ${patient.email ?? ''} ${patient.cpf ?? ''} ${patient.phone ?? ''} ${psychologist?.full_name ?? ''}`.toLowerCase()
      if (search && !haystack.includes(search.toLowerCase())) return false
      if (clinicFilter && patient.clinic_id !== clinicFilter) return false
      if (psychologistFilter && patient.responsible_psychologist_id !== psychologistFilter) return false
      if (statusFilter === 'active' && !patient.is_active) return false
      if (statusFilter === 'inactive' && patient.is_active) return false
      return true
    }),
    [patients.data, search, clinicFilter, psychologistFilter, statusFilter, psychologistById],
  )

  function openCreate() {
    setFormStep(1)
    setFormError('')
    setForm({ ...emptyPatient, responsible_psychologist_id: psychologistScope ? profile?.id ?? '' : psychologists[0]?.id ?? '' })
  }

  function openEdit(patient: Patient) {
    setFormStep(1)
    setFormError('')
    setForm(toForm(patient))
  }

  function closeForm() {
    setForm(null)
    setFormError('')
    setFormStep(1)
  }

  function advanceForm() {
    if (!form) return
    if (formStep === 1) {
      if (!form.full_name.trim()) {
        setFormError('Informe o nome completo do paciente para continuar.')
        return
      }
      if (!form.responsible_psychologist_id) {
        setFormError('Selecione o psicólogo responsável pelo acompanhamento.')
        return
      }
      if (!form.id && !form.email.trim()) {
        setFormError('Informe o e-mail que será usado para acessar o aplicativo.')
        return
      }
      if (!form.id && form.password.length < 8) {
        setFormError('A senha inicial precisa ter pelo menos 8 caracteres.')
        return
      }
    }
    setFormError('')
    setFormStep((step) => Math.min(3, step + 1) as 1 | 2 | 3)
  }

  function submitPatient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (formStep < 3) {
      advanceForm()
      return
    }
    if (!form?.full_name.trim() || !form.responsible_psychologist_id) return
    if (!form.id) {
      if (!form.email.trim()) {
        setMessage({ tone: 'warning', text: 'Informe o e-mail do paciente para criar acesso ao app.' })
        return
      }
      if (form.password.length < 8) {
        setMessage({ tone: 'warning', text: 'A senha inicial precisa ter pelo menos 8 caracteres.' })
        return
      }
    }
    saveMutation.mutate(form)
  }

  function psychologistLabel(user: UserProfile) {
    const clinicName = user.clinic_id ? clinicById.get(user.clinic_id) : null
    return `${user.full_name}${clinicName ? ` · ${clinicName}` : ''}`
  }

  function clearFilters() {
    setClinicFilter('')
    setPsychologistFilter('')
    setStatusFilter('')
  }

  if (platformScope) {
    return <Navigate to="/visao-pacientes" replace />
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Cuidado clínico"
        title="Pacientes"
        description="Cadastro, vínculo clínico, status e acesso ao aplicativo."
        action={<Button variant="primary" onClick={openCreate}><Plus size={16} aria-hidden="true" /> Novo paciente</Button>}
      />

      {message ? (
        <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 5000 : undefined} />
      ) : null}

      <section className="clinical-alert-board">
        <article className="clinical-alert-hero">
          <BellRing size={24} aria-hidden="true" />
          <div>
            <span className="eyebrow">Atenção clínica</span>
            <strong>{attentionSummary.urgentAlerts.length} alertas prioritários</strong>
            <p>{attentionSummary.alerts.length ? 'Revise pacientes com pendências de acompanhamento antes da próxima sessão.' : 'Nenhum alerta clínico retornado para este usuário.'}</p>
          </div>
        </article>
        <article>
          <span>Dados incompletos</span>
          <strong>{attentionSummary.incompletePatients.length}</strong>
          <small>Pacientes abaixo de 70% de cadastro.</small>
        </article>
        <article>
          <span>Sem acesso ao app</span>
          <strong>{attentionSummary.withoutApp.length}</strong>
          <small>Podem precisar de convite ou vínculo.</small>
        </article>
        <article>
          <span>Alertas totais</span>
          <strong>{attentionSummary.alerts.length}</strong>
          <small>Convites, check-ins, resultados e questionários.</small>
        </article>
      </section>

      {clinicalAlerts.error || dataCompletion.error ? (
        <InlineNotice
          tone="warning"
          message="Algumas RPCs de alertas/completude não responderam neste ambiente. A lista continua usando indicadores locais quando possível."
        />
      ) : null}

      {attentionSummary.alerts.length ? (
        <section className="clinical-alert-strip">
          {attentionSummary.alerts.slice(0, 4).map((alert) => (
            <Link to={alert.patient_id ? `/pacientes/${alert.patient_id}` : '/pacientes'} key={alert.id}>
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <strong>{alert.title}</strong>
                <small>{alert.patient_name ? `${alert.patient_name} · ` : ''}{alert.message}</small>
              </span>
              <Badge tone={alertTone(alert.severity)}>{alertKindLabel(alert.kind)}</Badge>
            </Link>
          ))}
        </section>
      ) : null}

      <FilterBar resultCount={filtered.length} resultLabel="pacientes">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar paciente, CPF, e-mail ou psicólogo" />
        {!psychologistScope ? (
          <FilterSelect value={clinicFilter} onChange={setClinicFilter} label="Filtrar por clínica">
            <option value="">Todas as clínicas</option>
            {(clinics.data ?? []).map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
          </FilterSelect>
        ) : null}
        {!psychologistScope ? (
          <FilterSelect value={psychologistFilter} onChange={setPsychologistFilter} label="Filtrar por psicólogo">
            <option value="">Todos os psicólogos</option>
            {psychologists.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
          </FilterSelect>
        ) : null}
        <FilterSelect value={statusFilter} onChange={setStatusFilter} label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </FilterSelect>
        {activeFilterCount ? <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar ({activeFilterCount})</Button> : null}
      </FilterBar>

      <DataState loading={patients.isLoading || clinics.isLoading || users.isLoading} error={patients.error || clinics.error || users.error} onRetry={() => { patients.refetch(); clinics.refetch(); users.refetch() }}>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Atenção</th>
                <th>Clínica / Responsável</th>
                <th>Acesso app</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => {
                const psychologist = psychologistById.get(patient.responsible_psychologist_id ?? '')
                const patientAlerts = alertsByPatient.get(patient.id) ?? []
                const completion = completionByPatient.get(patient.id) ?? fallbackCompletion(patient)
                const mainAlert = patientAlerts[0]
                return (
                  <tr key={patient.id}>
                    <td>
                      <div className="table-person">
                        <span><UserRoundCheck size={16} aria-hidden="true" /></span>
                        <div>
                          <strong>{patient.full_name}</strong>
                          <small>{patient.email ?? 'Sem e-mail'}{patient.phone ? ` · ${patient.phone}` : ''}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="patient-attention-cell">
                        {mainAlert ? (
                          <Badge tone={alertTone(mainAlert.severity)}>{alertKindLabel(mainAlert.kind)}</Badge>
                        ) : (
                          <Badge tone={completion.completion_rate < 70 ? 'warning' : 'success'}>{completion.completion_rate < 70 ? 'Cadastro incompleto' : 'Em dia'}</Badge>
                        )}
                        <small><Clock3 size={13} aria-hidden="true" /> {patientAlerts.length ? `${patientAlerts.length} alerta${patientAlerts.length === 1 ? '' : 's'}` : `${completion.completion_rate}% completo`}</small>
                      </div>
                    </td>
                    <td>
                      <strong>{clinicById.get(patient.clinic_id) ?? (psychologistScope ? 'Sua clínica' : 'Clínica não encontrada')}</strong>
                      <small>{psychologist?.full_name ?? patient.responsible_psychologist?.full_name ?? 'Sem responsável'}</small>
                    </td>
                    <td>
                      <Badge tone={patient.profile_id ? 'success' : 'neutral'}>
                        {patient.profile_id ? 'Com app' : 'Sem app'}
                      </Badge>
                    </td>
                    <td><StatusBadge active={patient.is_active} /></td>
                    <td>{formatDate(patient.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/pacientes/${patient.id}`}><Button variant="ghost" size="icon" title="Ver detalhe"><Eye size={16} /></Button></Link>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(patient)}><Edit3 size={16} /></Button>
                        <Button variant="ghost" size="icon" title={patient.is_active ? 'Inativar' : 'Ativar'} disabled={activeMutation.isPending} onClick={() => activeMutation.mutate({ id: patient.id, active: !patient.is_active })}>
                          {patient.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                        </Button>
                        <Button variant="danger" size="icon" title="Excluir" onClick={() => setDeleteTarget(patient)}><Trash2 size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length ? <div className="empty">Nenhum paciente encontrado.</div> : null}
        </div>
      </DataState>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir paciente"
        description={deleteTarget ? `O paciente "${deleteTarget.full_name}" será removido definitivamente, incluindo respostas e histórico vinculado conforme regras do backend.` : ''}
        confirmLabel="Excluir definitivamente"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      {form ? (
        <div className="modal-backdrop" role="presentation" onClick={closeForm}>
          <form className="modal-card wide patient-wizard" onSubmit={submitPatient} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="patient-form-title">
            <header>
              <div className="modal-title-row">
                <div className="modal-title-icon"><UserRoundCheck size={20} aria-hidden="true" /></div>
                <div><h2 id="patient-form-title">{form.id ? 'Editar paciente' : 'Novo paciente'}</h2><p>{form.id ? 'Revise o cadastro e mantenha o vínculo clínico atualizado.' : 'Cadastre o acesso e organize o vínculo clínico em poucos passos.'}</p></div>
              </div>
              <div className="form-stepper" aria-label={`Etapa ${formStep} de 3`}>
                {['Identificação', 'Perfil', 'Revisão'].map((label, index) => {
                  const step = (index + 1) as 1 | 2 | 3
                  return <div className={step === formStep ? 'active' : step < formStep ? 'complete' : ''} key={label}><span>{step < formStep ? <Check size={13} /> : step}</span><strong>{label}</strong></div>
                })}
              </div>
            </header>

            {formError ? <div className="form-step-error" role="alert">{formError}</div> : null}

            {formStep === 1 ? (
              <div className="wizard-step" key="identity">
                <FormSection title="Identificação e vínculo" description="Dados essenciais para localizar o paciente e definir seu responsável clínico.">
                  <label>Nome completo<input autoFocus value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required /></label>
                  <label>Psicólogo responsável<select value={form.responsible_psychologist_id} onChange={(event) => setForm({ ...form, responsible_psychologist_id: event.target.value })} required disabled={psychologistScope}><option value="">Selecione</option>{psychologists.map((user) => <option key={user.id} value={user.id}>{psychologistLabel(user)}</option>)}</select></label>
                  {!form.id ? <label>E-mail de acesso<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label> : <label>E-mail de acesso<input type="email" value={form.email} disabled /></label>}
                  {!form.id ? <label>Senha inicial<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} required /><small>Use pelo menos 8 caracteres.</small></label> : null}
                  <label>CPF<input value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })} disabled={Boolean(form.id)} /></label>
                  <label>Data de nascimento<input type="date" value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} /></label>
                  <label className="span-two">Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                </FormSection>
              </div>
            ) : null}

            {formStep === 2 ? (
              <div className="wizard-step" key="profile">
                <FormSection title="Perfil sociodemográfico" description="Informações opcionais que completam o contexto do atendimento.">
                  <label>Gênero<select autoFocus value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Não informado</option><option value="female">Feminino</option><option value="male">Masculino</option><option value="non_binary">Não binário</option><option value="other">Outro</option></select></label>
                  <label>Estado civil<select value={form.relationship_status} onChange={(event) => setForm({ ...form, relationship_status: event.target.value })}><option value="">Não informado</option><option value="single">Solteiro(a)</option><option value="married">Casado(a)</option><option value="divorced">Divorciado(a)</option><option value="widowed">Viúvo(a)</option><option value="stable_union">União estável</option></select></label>
                  <label>Escolaridade<select value={form.education_level} onChange={(event) => setForm({ ...form, education_level: event.target.value })}><option value="">Não informado</option><option value="elementary">Ensino fundamental</option><option value="high_school">Ensino médio</option><option value="undergraduate">Ensino superior</option><option value="graduate">Pós-graduação</option></select></label>
                  <label>Ocupação<input value={form.occupation} onChange={(event) => setForm({ ...form, occupation: event.target.value })} /></label>
                  <label>País de nascimento<input value={form.country_birth} onChange={(event) => setForm({ ...form, country_birth: event.target.value })} /></label>
                  <label>Estado de nascimento<input value={form.state_birth} onChange={(event) => setForm({ ...form, state_birth: event.target.value })} /></label>
                  <label>Orientação religiosa<input value={form.religious_orientation} onChange={(event) => setForm({ ...form, religious_orientation: event.target.value })} /></label>
                  <label>Grupo étnico<input value={form.ethnic_group} onChange={(event) => setForm({ ...form, ethnic_group: event.target.value })} /></label>
                  <label>Orientação sexual<select value={form.sexual_orientation} onChange={(event) => setForm({ ...form, sexual_orientation: event.target.value })}><option value="">Não informado</option><option value="heterosexual">Heterossexual</option><option value="homosexual">Homossexual</option><option value="bisexual">Bissexual</option><option value="asexual">Assexual</option><option value="pansexual">Pansexual</option></select></label>
                  <label>Tem filhos?<select value={form.has_children} onChange={(event) => setForm({ ...form, has_children: event.target.value })}><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select></label>
                </FormSection>
              </div>
            ) : null}

            {formStep === 3 ? (
              <div className="wizard-step patient-review" key="review">
                <div className="review-hero"><div><ShieldCheck size={22} /></div><span><strong>Pronto para salvar</strong><small>Confira os dados essenciais antes de concluir.</small></span></div>
                <div className="review-grid">
                  <div><span>Paciente</span><strong>{form.full_name}</strong><small>{form.email || 'E-mail não informado'}</small></div>
                  <div><span>Responsável clínico</span><strong>{psychologistById.get(form.responsible_psychologist_id)?.full_name ?? 'Não selecionado'}</strong><small>{clinicById.get(psychologistById.get(form.responsible_psychologist_id)?.clinic_id ?? '') ?? 'Clínica não identificada'}</small></div>
                  <div><span>Contato</span><strong>{form.phone || 'Telefone não informado'}</strong><small>{form.birth_date ? `Nascimento: ${form.birth_date.split('-').reverse().join('/')}` : 'Nascimento não informado'}</small></div>
                  <div><span>Cadastro complementar</span><strong>{[form.gender, form.relationship_status, form.education_level, form.occupation].filter(Boolean).length} informações preenchidas</strong><small>Os demais campos continuam opcionais.</small></div>
                </div>
              </div>
            ) : null}

            <footer>
              <Button variant="ghost" type="button" onClick={formStep === 1 ? closeForm : () => { setFormError(''); setFormStep((step) => Math.max(1, step - 1) as 1 | 2 | 3) }}>
                {formStep === 1 ? 'Cancelar' : <><ArrowLeft size={16} /> Voltar</>}
              </Button>
              {formStep < 3 ? (
                <Button variant="primary" type="button" onClick={advanceForm}>Continuar <ArrowRight size={16} /></Button>
              ) : (
                <Button variant="primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : <><Check size={16} /> Salvar paciente</>}</Button>
              )}
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}
