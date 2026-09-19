import { getSupabase } from '../lib/supabase'
import type { AdminProfile, AuditData, CaseConceptualizationRow, ClinicalHypothesisRow, Clinic, ClinicDetailData, ClinicalAlertSeverity, ClinicalReportIncludeOptions, ClinicalReportPdfResult, ClinicFeatureEntitlement, CreatedPatientInvitation, DashboardData, GenogramData, GenogramFamilyPatternsRow, GenogramPersonNoteRow, GenogramPersonRow, GenogramRelationshipRow, LibraryIndicationRow, LibraryWorkLayer, LibraryWorkRow, Patient, PatientClinicalImpressionsRow, PatientClinicalIntakeRow, PatientDataCompletionRow, PatientDetailData, PatientFamilyContextRow, PatientIntakeRow, PatientInvitation, PatientLifeAreaNoteRow, PatientLifeAreaRow, PatientOverviewData, PatientPortalQuestionnaireAssignment, PatientPortalResultsData, PatientTimelineEventRow, PersonalityAssessmentRow, PersonalityClinicalSynthesis, PersonalityConceptualizationIntegration, PersonalityResults, PlansData, ProfileRole, PsychoeducationCard, PsychoeducationModuleRow, PsychologistAlertKind, PsychologistAlertRow, PsychologistDetailData, QuestionnaireCatalogItem, QuestionnaireAccessRow, QuestionnaireDetail, QuestionnaireQuestion, QuestionnaireSessionData, ReportsData, SchemaActivationRow, SettingsData, TherapyResourceRow, TimelineEventNoteRow, TimelineEventPersonRow, UserProfile } from '../types'

function throwIfError(error: unknown) {
  if (error) throw error
}

type FunctionErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: Record<string, unknown>
  }
  message?: string
}

function translateFunctionMessage(message: string, functionName: string) {
  if (message === 'Only psychologists can perform this clinical action') {
    return `A função ${functionName} está permitindo criação apenas por psicólogos. Para criar pelo painel administrativo, o backend precisa liberar o gestor da clínica nessa Edge Function.`
  }

  if (message === 'Email already registered' || message === 'Email already registered in this clinic') {
    return 'Este e-mail já está cadastrado. Use outro e-mail para criar o acesso do paciente.'
  }

  if (message === 'Failed to create auth user') {
    return 'Não foi possível criar o acesso do paciente no Auth do Supabase.'
  }

  if (
    message === 'responsible_psychologist_id must belong to an allowed staff profile in your clinic' ||
    message === 'responsible_psychologist_id must belong to your clinic'
  ) {
    return 'O psicólogo responsável selecionado não pertence à clínica permitida para este usuário.'
  }

  if (message === 'responsible_psychologist_id must be an active psychologist') {
    return 'Selecione um psicólogo ativo como responsável pelo paciente.'
  }

  if (message === 'Este psicólogo não está liberado para receber novos pacientes.') {
    return message
  }

  if (message === 'Este psicólogo atingiu o limite de pacientes definido pelo administrador.') {
    return message
  }

  if (message === 'Já existe um convite pendente para este e-mail.') {
    return message
  }

  if (message === 'You do not have access to this questionnaire') {
    return 'Este psicólogo não tem acesso administrativo a este questionário.'
  }

  if (message === 'Questionnaire not found or inactive') {
    return 'Questionário não encontrado ou inativo.'
  }

  if (message === 'Failed to create assignment') {
    return 'Não foi possível liberar este questionário para o paciente.'
  }

  if (message === 'Questionnaire not released for this patient') {
    return 'Este questionário ainda não foi liberado para este paciente.'
  }

  if (message === 'Finalize todas as figuras parentais antes de concluir o questionário.') {
    return message
  }

  if (message === 'response_context_id é obrigatório para Estilos Parentais.') {
    return 'Selecione uma figura parental para responder este item.'
  }

  return message
}

async function throwIfFunctionError(error: unknown, functionName: string) {
  if (!error) return

  const maybeResponse = (error as { context?: unknown }).context
  const response = maybeResponse instanceof Response ? maybeResponse.clone() : null

  if (response) {
    let body: FunctionErrorBody | null = null
    try {
      body = (await response.json()) as FunctionErrorBody
    } catch {
      body = null
    }

    const message = body?.error?.message ?? body?.message
    const details = body?.error?.details
    const hint = details && 'hint' in details ? String(details.hint) : null
    const translated = message ? translateFunctionMessage(message, functionName) : null

    if (translated) {
      throw new Error(hint ? `${translated} Detalhe: ${hint}` : translated)
    }
  }

  throw error
}

function clean(value?: string | null) {
  const text = value?.trim()
  return text ? text : null
}

function cleanDate(value?: string | null) {
  const text = clean(value)
  return text ? text.slice(0, 10) : null
}

function withAuthAvatar(profile: AdminProfile, metadata?: Record<string, unknown> | null): AdminProfile {
  const avatarType = typeof metadata?.avatar_type === 'string'
    ? metadata.avatar_type
    : typeof metadata?.avatarType === 'string'
      ? metadata.avatarType
      : null
  const avatarUrl = typeof metadata?.avatar_url === 'string'
    ? metadata.avatar_url
    : typeof metadata?.avatarUrl === 'string'
      ? metadata.avatarUrl
      : null
  const avatarConfig = metadata?.avatar_config && typeof metadata.avatar_config === 'object'
    ? metadata.avatar_config as Record<string, unknown>
    : metadata?.avatarConfig && typeof metadata.avatarConfig === 'object'
      ? metadata.avatarConfig as Record<string, unknown>
      : null

  return {
    ...profile,
    avatar_type: avatarType,
    avatar_url: avatarUrl,
    avatar_config: avatarConfig,
  }
}

export async function getCurrentProfile(): Promise<AdminProfile | null> {
  const client = getSupabase()
  const { data: sessionData, error: sessionError } = await client.auth.getUser()
  throwIfError(sessionError)
  const user = sessionData.user
  if (!user) return null

  const select = 'id, clinic_id, full_name, email, role, is_active'
  const byId = await client.from('profiles').select(select).eq('id', user.id).maybeSingle()
  throwIfError(byId.error)
  if (byId.data) return withAuthAvatar(byId.data as AdminProfile, user.user_metadata)

  const email = user.email?.trim().toLowerCase()
  if (!email) return null

  const byEmail = await client.from('profiles').select(select).ilike('email', email).maybeSingle()
  throwIfError(byEmail.error)
  return byEmail.data ? withAuthAvatar(byEmail.data as AdminProfile, user.user_metadata) : null
}

export async function updateMyProfile(input: { full_name: string }) {
  const client = getSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  throwIfError(userError)
  const userId = userData.user?.id
  if (!userId) throw new Error('Usuário não autenticado.')
  const { error } = await client.from('profiles').update({ full_name: input.full_name.trim() }).eq('id', userId)
  throwIfError(error)
}

export async function saveMyAvatar(config: {
  avatar_type: 'initials' | 'photo'
  avatar_url?: string | null
  avatar_config?: Record<string, unknown> | null
}) {
  const client = getSupabase()
  const { error } = await client.auth.updateUser({
    data: {
      avatar_type: config.avatar_type,
      avatar_url: config.avatar_url ?? null,
      avatar_config: config.avatar_config ?? null,
    },
  })
  throwIfError(error)
}

export async function getDashboardData(): Promise<DashboardData> {
  const client = getSupabase()
  const [clinics, activeClinics, users, psychologists, patients, activePatients, questionnaires, responses] = await Promise.all([
    client.from('clinics').select('id', { count: 'exact', head: true }),
    client.from('clinics').select('id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('profiles').select('id', { count: 'exact', head: true }),
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'psychologist'),
    client.from('patients').select('id', { count: 'exact', head: true }),
    client.from('patients').select('id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('questionnaires').select('id', { count: 'exact', head: true }),
    client.from('questionnaire_responses').select('id', { count: 'exact', head: true }),
  ])

  ;[clinics, activeClinics, users, psychologists, patients, activePatients, questionnaires, responses].forEach((result) => {
    throwIfError(result.error)
  })

  return {
    clinics: clinics.count ?? 0,
    activeClinics: activeClinics.count ?? 0,
    users: users.count ?? 0,
    psychologists: psychologists.count ?? 0,
    patients: patients.count ?? 0,
    activePatients: activePatients.count ?? 0,
    questionnaires: questionnaires.count ?? 0,
    responses: responses.count ?? 0,
  }
}

export async function listClinics(): Promise<Clinic[]> {
  const client = getSupabase()
  const [clinicsResult, profileRows, patientRows] = await Promise.all([
    client.from('clinics').select('id, name, document, email, phone, clinic_type, is_active, created_at, updated_at').order('name'),
    client.from('profiles').select('clinic_id, role').in('role', ['platform_admin', 'psychologist']),
    client.from('patients').select('clinic_id'),
  ])

  throwIfError(clinicsResult.error)
  throwIfError(profileRows.error)
  throwIfError(patientRows.error)

  const userCount = new Map<string, number>()
  for (const row of profileRows.data ?? []) {
    const clinicId = row.clinic_id as string | null
    if (clinicId) userCount.set(clinicId, (userCount.get(clinicId) ?? 0) + 1)
  }

  const patientCount = new Map<string, number>()
  for (const row of patientRows.data ?? []) {
    const clinicId = row.clinic_id as string | null
    if (clinicId) patientCount.set(clinicId, (patientCount.get(clinicId) ?? 0) + 1)
  }

  return ((clinicsResult.data ?? []) as Clinic[]).map((clinic) => ({
    ...clinic,
    user_count: userCount.get(clinic.id) ?? 0,
    patient_count: patientCount.get(clinic.id) ?? 0,
  }))
}

export async function saveClinic(input: {
  id?: string
  name: string
  clinic_type: string
  document?: string | null
  email?: string | null
  phone?: string | null
}) {
  const payload = {
    name: input.name.trim(),
    clinic_type: input.clinic_type,
    document: clean(input.document),
    email: clean(input.email),
    phone: clean(input.phone),
  }

  const query = input.id
    ? getSupabase().from('clinics').update(payload).eq('id', input.id).select('id').single()
    : getSupabase().from('clinics').insert(payload).select('id').single()

  const { data, error } = await query
  throwIfError(error)
  return data as { id: string }
}

export async function setClinicActive(clinicId: string, isActive: boolean) {
  const { error } = await getSupabase().from('clinics').update({ is_active: isActive }).eq('id', clinicId)
  throwIfError(error)
}

export async function deleteClinic(clinicId: string, confirmationName: string) {
  const { error } = await getSupabase().functions.invoke('delete-clinic', {
    body: { clinic_id: clinicId, confirmation_name: confirmationName },
  })
  throwIfError(error)
}

export async function listUsers(): Promise<UserProfile[]> {
  const client = getSupabase()
  const [usersResult, patientRows, invitationRows] = await Promise.all([
    client
      .from('profiles')
      .select('id, clinic_id, full_name, email, phone, role, crp, is_active, can_receive_patients, patient_assignment_limit, created_at, clinic:clinics!profiles_clinic_id_fkey(id, name, clinic_type, is_active)')
      .in('role', ['platform_admin', 'psychologist'])
      .order('full_name'),
    client.from('patients').select('responsible_psychologist_id').eq('is_active', true),
    client.from('patient_invitations').select('responsible_psychologist_id').eq('status', 'pending'),
  ])

  throwIfError(usersResult.error)
  throwIfError(patientRows.error)
  throwIfError(invitationRows.error)

  const patientsByPsychologist = new Map<string, number>()
  for (const row of patientRows.data ?? []) {
    const id = row.responsible_psychologist_id as string | null
    if (id) patientsByPsychologist.set(id, (patientsByPsychologist.get(id) ?? 0) + 1)
  }

  const invitationsByPsychologist = new Map<string, number>()
  for (const row of invitationRows.data ?? []) {
    const id = row.responsible_psychologist_id as string | null
    if (id) invitationsByPsychologist.set(id, (invitationsByPsychologist.get(id) ?? 0) + 1)
  }

  return ((usersResult.data ?? []) as unknown as UserProfile[]).map((rawUser) => {
    const user = { ...rawUser, clinic: Array.isArray(rawUser.clinic) ? rawUser.clinic[0] ?? null : rawUser.clinic } as UserProfile
    return {
      ...user,
      assigned_patients_count: patientsByPsychologist.get(user.id) ?? 0,
      pending_patient_invitations_count: invitationsByPsychologist.get(user.id) ?? 0,
    }
  })
}

export async function createUser(input: {
  full_name: string
  email: string
  password: string
  role: ProfileRole
  clinic_id: string
  phone?: string | null
  crp?: string | null
}) {
  const { data, error } = await getSupabase().functions.invoke('create-staff-user', {
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      full_name: input.full_name.trim(),
      role: input.role,
      clinic_id: input.clinic_id,
      phone: clean(input.phone),
      crp: input.role === 'psychologist' ? clean(input.crp) : null,
    },
  })
  throwIfError(error)
  return data
}

export async function updateUser(input: {
  id: string
  full_name: string
  email: string
  phone?: string | null
  crp?: string | null
  role: ProfileRole
  clinic_id: string
}) {
  const { error } = await getSupabase()
    .from('profiles')
    .update({
      full_name: input.full_name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: clean(input.phone),
      crp: input.role === 'psychologist' ? clean(input.crp) : null,
      role: input.role,
      clinic_id: input.clinic_id,
    })
    .eq('id', input.id)
  throwIfError(error)
}

export async function setUserActive(profileId: string, isActive: boolean) {
  const { error } = await getSupabase().from('profiles').update({ is_active: isActive }).eq('id', profileId)
  throwIfError(error)
}

export async function updatePsychologistAccess(profileId: string, canReceivePatients: boolean, patientAssignmentLimit: number | null) {
  const { error } = await getSupabase()
    .from('profiles')
    .update({ can_receive_patients: canReceivePatients, patient_assignment_limit: patientAssignmentLimit })
    .eq('id', profileId)
    .eq('role', 'psychologist')
  throwIfError(error)
}

export async function deleteUser(profileId: string) {
  const { error } = await getSupabase().functions.invoke('delete-staff-user', {
    body: { profile_id: profileId },
  })
  throwIfError(error)
}

export async function listPatients(): Promise<Patient[]> {
  const { data, error } = await getSupabase()
    .from('patients')
    .select(`
      id,
      clinic_id,
      profile_id,
      responsible_psychologist_id,
      full_name,
      email,
      phone,
      cpf,
      birth_date,
      gender,
      relationship_status,
      education_level,
      occupation,
      country_birth,
      state_birth,
      religious_orientation,
      ethnic_group,
      sexual_orientation,
      has_children,
      is_active,
      inactivated_at,
      created_at,
      responsible_psychologist:profiles!patients_responsible_psychologist_id_fkey(full_name),
      access_profile:profiles!patients_profile_id_fkey(is_active)
    `)
    .order('full_name')
  throwIfError(error)
  return (data ?? []) as unknown as Patient[]
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function normalizeAlertSeverity(kind: PsychologistAlertKind, raw?: string | null): ClinicalAlertSeverity {
  if (raw === 'danger' || raw === 'warning' || raw === 'info' || raw === 'success') return raw
  if (kind === 'expiringInvitation') return 'danger'
  if (kind === 'staleQuestionnaire') return 'warning'
  if (kind === 'missingCheckin') return 'info'
  if (kind === 'pendingResultsRelease') return 'success'
  return 'warning'
}

function alertTitle(kind: PsychologistAlertKind) {
  const labels: Record<string, string> = {
    expiringInvitation: 'Convite prestes a expirar',
    staleQuestionnaire: 'Questionário parado',
    missingCheckin: 'Check-in ausente',
    pendingResultsRelease: 'Resultado aguardando liberação',
  }
  return labels[kind] ?? 'Alerta clínico'
}

function normalizePsychologistAlert(row: unknown, index: number): PsychologistAlertRow {
  const record = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
  const kind = (pickString(record, ['kind', 'type', 'alert_kind', 'alertKind']) ?? 'clinicalAlert') as PsychologistAlertKind
  const patientName = pickString(record, ['patient_name', 'patientName', 'full_name', 'patient'])
  const title = pickString(record, ['title', 'label']) ?? alertTitle(kind)
  const message = pickString(record, ['message', 'description', 'details', 'body'])
    ?? (patientName ? `${patientName} exige atenção.` : 'Revise este item clínico.')

  return {
    id: pickString(record, ['id', 'alert_id', 'alertId']) ?? `${kind}-${index}`,
    kind,
    severity: normalizeAlertSeverity(kind, pickString(record, ['severity', 'tone'])),
    patient_id: pickString(record, ['patient_id', 'patientId']),
    patient_name: patientName,
    title,
    message,
    action_label: pickString(record, ['action_label', 'actionLabel']),
    due_at: pickString(record, ['due_at', 'dueAt', 'expires_at', 'expiresAt']),
    created_at: pickString(record, ['created_at', 'createdAt']),
  }
}

function normalizePatientCompletion(row: unknown, patientIdFallback?: string): PatientDataCompletionRow | null {
  const record = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
  const patientId = pickString(record, ['patient_id', 'patientId', 'id']) ?? patientIdFallback
  if (!patientId) return null
  const completionRate = pickNumber(record, ['completion_rate', 'completionRate', 'rate', 'percent']) ?? 0
  const missing = record.missing_fields ?? record.missingFields
  return {
    patient_id: patientId,
    completion_rate: Math.max(0, Math.min(100, Math.round(completionRate))),
    completed_fields: pickNumber(record, ['completed_fields', 'completedFields']),
    total_fields: pickNumber(record, ['total_fields', 'totalFields']),
    missing_fields: Array.isArray(missing) ? missing.map(String) : null,
  }
}

export async function listPsychologistAlerts(): Promise<PsychologistAlertRow[]> {
  const { data, error } = await getSupabase().rpc('get_psychologist_alerts')
  throwIfError(error)
  return (Array.isArray(data) ? data : []).map(normalizePsychologistAlert)
}

export async function listPatientsDataCompletion(): Promise<PatientDataCompletionRow[]> {
  const { data, error } = await getSupabase().rpc('get_patients_data_completion')
  throwIfError(error)

  if (Array.isArray(data)) {
    return data.map((row) => normalizePatientCompletion(row)).filter(Boolean) as PatientDataCompletionRow[]
  }

  if (data && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .map(([patientId, row]) => normalizePatientCompletion(row, patientId))
      .filter(Boolean) as PatientDataCompletionRow[]
  }

  return []
}

export async function createPatient(input: {
  full_name: string
  email: string
  password: string
  responsible_psychologist_id: string
  phone?: string | null
  cpf?: string | null
  birth_date?: string | null
  gender?: string | null
  relationship_status?: string | null
  education_level?: string | null
  occupation?: string | null
  country_birth?: string | null
  state_birth?: string | null
  religious_orientation?: string | null
  ethnic_group?: string | null
  sexual_orientation?: string | null
  has_children?: boolean | null
}) {
  const { data, error } = await getSupabase().functions.invoke('create-patient', {
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      full_name: input.full_name.trim(),
      responsible_psychologist_id: input.responsible_psychologist_id,
      phone: clean(input.phone),
      cpf: clean(input.cpf),
      birth_date: cleanDate(input.birth_date),
      gender: clean(input.gender),
      relationship_status: clean(input.relationship_status),
      education_level: clean(input.education_level),
      occupation: clean(input.occupation),
      country_birth: clean(input.country_birth),
      state_birth: clean(input.state_birth),
      religious_orientation: clean(input.religious_orientation),
      ethnic_group: clean(input.ethnic_group),
      sexual_orientation: clean(input.sexual_orientation),
      has_children: input.has_children,
    },
  })
  await throwIfFunctionError(error, 'create-patient')
  return data
}

export async function updatePatient(input: {
  id: string
  full_name: string
  phone?: string | null
  birth_date?: string | null
  gender?: string | null
  relationship_status?: string | null
  education_level?: string | null
  occupation?: string | null
  country_birth?: string | null
  state_birth?: string | null
  religious_orientation?: string | null
  ethnic_group?: string | null
  sexual_orientation?: string | null
  has_children?: boolean | null
  responsible_psychologist_id: string
}) {
  const { error } = await getSupabase()
    .from('patients')
    .update({
      full_name: input.full_name.trim(),
      phone: clean(input.phone),
      birth_date: cleanDate(input.birth_date),
      gender: clean(input.gender),
      relationship_status: clean(input.relationship_status),
      education_level: clean(input.education_level),
      occupation: clean(input.occupation),
      country_birth: clean(input.country_birth),
      state_birth: clean(input.state_birth),
      religious_orientation: clean(input.religious_orientation),
      ethnic_group: clean(input.ethnic_group),
      sexual_orientation: clean(input.sexual_orientation),
      has_children: input.has_children,
      responsible_psychologist_id: input.responsible_psychologist_id,
    })
    .eq('id', input.id)
  throwIfError(error)
}

export async function setPatientActive(patientId: string, isActive: boolean) {
  const { error } = await getSupabase().rpc('set_patient_active_status', {
    p_patient_id: patientId,
    p_is_active: isActive,
  })
  throwIfError(error)
}

export async function deletePatient(patientId: string) {
  const { error } = await getSupabase().rpc('delete_patient_as_admin', {
    p_patient_id: patientId,
  })
  throwIfError(error)
}

export async function listPatientInvitations(): Promise<PatientInvitation[]> {
  const { data, error } = await getSupabase()
    .from('patient_invitations')
    .select(`
      id,
      clinic_id,
      invited_by,
      responsible_psychologist_id,
      email,
      full_name,
      phone,
      status,
      expires_at,
      accepted_at,
      patient_profile_id,
      patient_id,
      created_at,
      invited_by_profile:profiles!patient_invitations_invited_by_fkey(full_name),
      responsible_psychologist_profile:profiles!patient_invitations_responsible_psychologist_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
  throwIfError(error)
  return (data ?? []) as unknown as PatientInvitation[]
}

export async function createPatientInvitation(input: {
  email: string
  full_name?: string | null
  phone?: string | null
  responsible_psychologist_id: string
}): Promise<CreatedPatientInvitation> {
  const { data, error } = await getSupabase().functions.invoke('create-patient-invitation', {
    body: {
      email: input.email.trim().toLowerCase(),
      full_name: clean(input.full_name),
      phone: clean(input.phone),
      responsible_psychologist_id: input.responsible_psychologist_id,
    },
  })
  await throwIfFunctionError(error, 'create-patient-invitation')

  const payload = (data as { data?: CreatedPatientInvitation })?.data ?? data
  if (!payload || typeof payload !== 'object' || !('invite_url' in payload)) {
    throw new Error('Convite criado, mas o link não foi retornado pela Edge Function.')
  }
  return payload as CreatedPatientInvitation
}

export async function acceptPatientInvitation(input: {
  token: string
  password: string
  full_name: string
  phone?: string | null
  cpf?: string | null
  birth_date?: string | null
  gender?: string | null
  relationship_status?: string | null
  education_level?: string | null
  occupation?: string | null
  country_birth?: string | null
  state_birth?: string | null
  religious_orientation?: string | null
  ethnic_group?: string | null
  sexual_orientation?: string | null
  has_children?: boolean | null
}) {
  const { data, error } = await getSupabase().functions.invoke('accept-patient-invitation', {
    body: {
      token: input.token.trim(),
      password: input.password,
      profile: {
        full_name: input.full_name.trim(),
        phone: clean(input.phone),
        cpf: clean(input.cpf),
        birth_date: cleanDate(input.birth_date),
        gender: clean(input.gender),
        relationship_status: clean(input.relationship_status),
        education_level: clean(input.education_level),
        occupation: clean(input.occupation),
        country_birth: clean(input.country_birth),
        state_birth: clean(input.state_birth),
        religious_orientation: clean(input.religious_orientation),
        ethnic_group: clean(input.ethnic_group),
        sexual_orientation: clean(input.sexual_orientation),
        has_children: input.has_children,
      },
      legal_consent: {
        terms_version: '2026-06-15',
        privacy_version: '2026-06-15',
      },
    },
  })
  await throwIfFunctionError(error, 'accept-patient-invitation')
  return (data as { data?: { patient_id: string; profile_id: string } })?.data ?? data
}

export async function listQuestionnaires(): Promise<QuestionnaireCatalogItem[]> {
  const client = getSupabase()
  const rpc = await client.rpc('admin_list_questionnaires')
  if (!rpc.error && Array.isArray(rpc.data)) {
    return rpc.data as QuestionnaireCatalogItem[]
  }

  const { data, error } = await client
    .from('questionnaires')
    .select('id, code, name, description, is_active, clinical_status, instrument_version, updated_at')
    .order('name', { ascending: true })
  throwIfError(error ?? rpc.error)
  return (data ?? []) as QuestionnaireCatalogItem[]
}


export async function getQuestionnaire(questionnaireId: string): Promise<QuestionnaireDetail> {
  const { data, error } = await getSupabase().rpc('admin_get_questionnaire', {
    p_questionnaire_id: questionnaireId,
  })
  throwIfError(error)
  return data as QuestionnaireDetail
}

export async function saveQuestionnaireDraft(input: {
  id?: string | null
  code: string
  name: string
  description?: string | null
  author_name?: string | null
  instrument_version: string
  citation?: string | null
  license_notes?: string | null
  reference_period: string
  scale_min: number
  scale_max: number
}) {
  const { data, error } = await getSupabase().rpc('admin_save_questionnaire_draft', {
    p_id: input.id ?? null,
    p_code: input.code,
    p_name: input.name,
    p_description: clean(input.description),
    p_author_name: clean(input.author_name),
    p_instrument_version: input.instrument_version,
    p_citation: clean(input.citation),
    p_license_notes: clean(input.license_notes),
    p_reference_period: input.reference_period,
    p_scale_min: input.scale_min,
    p_scale_max: input.scale_max,
  })
  throwIfError(error)
  return data as string
}

export async function saveQuestion(input: {
  questionnaire_id: string
  question_id?: string | null
  code: string
  text: string
  order_index: number
  answer_type: string
  scale_min: number
  scale_max: number
  weight: number
  reverse_score: boolean
}) {
  const { data, error } = await getSupabase().rpc('admin_save_question', {
    p_questionnaire_id: input.questionnaire_id,
    p_question_id: input.question_id ?? null,
    p_code: input.code,
    p_text: input.text,
    p_order_index: input.order_index,
    p_answer_type: input.answer_type,
    p_scale_min: input.scale_min,
    p_scale_max: input.scale_max,
    p_weight: input.weight,
    p_reverse_score: input.reverse_score,
  })
  throwIfError(error)
  return data as string
}

export async function deleteQuestion(questionnaireId: string, questionId: string) {
  const { error } = await getSupabase().rpc('admin_delete_question', {
    p_questionnaire_id: questionnaireId,
    p_question_id: questionId,
  })
  throwIfError(error)
}

export async function publishQuestionnaire(questionnaireId: string) {
  const { error } = await getSupabase().rpc('admin_publish_questionnaire', {
    p_questionnaire_id: questionnaireId,
  })
  throwIfError(error)
}

export async function archiveQuestionnaire(questionnaireId: string) {
  const { error } = await getSupabase().rpc('admin_archive_questionnaire', {
    p_questionnaire_id: questionnaireId,
  })
  throwIfError(error)
}

export async function deleteQuestionnaireDraft(questionnaireId: string) {
  const { error } = await getSupabase().rpc('admin_delete_questionnaire_draft', {
    p_questionnaire_id: questionnaireId,
  })
  throwIfError(error)
}

export async function duplicateQuestionnaireAsDraft(questionnaireId: string, newCode: string, newVersion: string) {
  const { data, error } = await getSupabase().rpc('admin_duplicate_questionnaire_as_draft', {
    p_questionnaire_id: questionnaireId,
    p_new_code: newCode,
    p_new_version: newVersion,
  })
  throwIfError(error)
  return data as string
}

export function isQuestionnaireEditable(detailOrItem: { is_active?: boolean | null; clinical_status?: string | null }) {
  return detailOrItem.is_active !== true && ['draft', 'validation'].includes(detailOrItem.clinical_status ?? 'draft')
}

export function normalizeQuestion(raw: QuestionnaireQuestion): QuestionnaireQuestion {
  return {
    ...raw,
    order_index: Number(raw.order_index ?? 0),
    scale_min: Number(raw.scale_min ?? 1),
    scale_max: Number(raw.scale_max ?? 5),
    weight: Number(raw.weight ?? 1),
    reverse_score: Boolean(raw.reverse_score),
  }
}

export async function listQuestionnaireAccessForProfessional(professionalId: string): Promise<QuestionnaireAccessRow[]> {
  const { data, error } = await getSupabase()
    .from('questionnaire_professional_access')
    .select('id, clinic_id, questionnaire_id, professional_id, granted_by, is_enabled, granted_at, revoked_at, updated_at')
    .eq('professional_id', professionalId)
  throwIfError(error)
  return (data ?? []) as QuestionnaireAccessRow[]
}

export async function setQuestionnaireProfessionalAccess(input: {
  clinic_id: string
  questionnaire_id: string
  professional_id: string
  granted_by: string
  is_enabled: boolean
}) {
  const { error } = await getSupabase()
    .from('questionnaire_professional_access')
    .upsert({
      clinic_id: input.clinic_id,
      questionnaire_id: input.questionnaire_id,
      professional_id: input.professional_id,
      granted_by: input.granted_by,
      is_enabled: input.is_enabled,
    }, { onConflict: 'questionnaire_id,professional_id' })
  throwIfError(error)
}
type ReportResponseRow = {
  id: string
  clinic_id: string
  patient_id: string
  questionnaire_id: string
  status: string
  created_at: string
  completed_at: string | null
}

type ReportPatientRow = {
  id: string
  clinic_id: string
  responsible_psychologist_id: string | null
  is_active: boolean
  created_at: string
}

function increment(map: Map<string, number>, key: string | null | undefined, amount = 1) {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + amount)
}

function monthKey(dateValue: string) {
  const date = new Date(dateValue)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  return `${month}/${year.slice(2)}`
}

function lastMonthKeys(count: number) {
  const now = new Date()
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

export async function getAdvancedReportsData(): Promise<ReportsData> {
  const client = getSupabase()
  const [clinicsResult, usersResult, patientsResult, questionnairesResult, responsesResult, invitationsResult] = await Promise.all([
    client.from('clinics').select('id, name, clinic_type, is_active').order('name'),
    client.from('profiles').select('id, clinic_id, full_name, email, role, is_active, can_receive_patients, patient_assignment_limit').in('role', ['platform_admin', 'psychologist']).order('full_name'),
    client.from('patients').select('id, clinic_id, responsible_psychologist_id, is_active, created_at'),
    client.from('questionnaires').select('id, code, name, is_active, clinical_status').order('name'),
    client.from('questionnaire_responses').select('id, clinic_id, patient_id, questionnaire_id, status, created_at, completed_at'),
    client.from('patient_invitations').select('id, clinic_id, responsible_psychologist_id, status, created_at'),
  ])

  ;[clinicsResult, usersResult, patientsResult, questionnairesResult, responsesResult, invitationsResult].forEach((result) => {
    throwIfError(result.error)
  })

  const clinics = (clinicsResult.data ?? []) as Array<{ id: string; name: string; clinic_type: string | null; is_active: boolean }>
  const users = (usersResult.data ?? []) as Array<{
    id: string
    clinic_id: string | null
    full_name: string
    email: string
    role: ProfileRole
    is_active: boolean
    can_receive_patients: boolean | null
    patient_assignment_limit: number | null
  }>
  const patients = (patientsResult.data ?? []) as ReportPatientRow[]
  const questionnaires = (questionnairesResult.data ?? []) as Array<{ id: string; code: string; name: string; is_active: boolean; clinical_status: string | null }>
  const responses = (responsesResult.data ?? []) as ReportResponseRow[]
  const invitations = (invitationsResult.data ?? []) as Array<{ id: string; clinic_id: string; responsible_psychologist_id: string | null; status: string; created_at: string }>

  const clinicById = new Map(clinics.map((clinic) => [clinic.id, clinic]))
  const patientById = new Map(patients.map((patient) => [patient.id, patient]))
  const usersByClinic = new Map<string, number>()
  const psychologistsByClinic = new Map<string, number>()
  const patientsByClinic = new Map<string, number>()
  const activePatientsByClinic = new Map<string, number>()
  const responsesByClinic = new Map<string, number>()
  const completedResponsesByClinic = new Map<string, number>()
  const pendingInvitationsByClinic = new Map<string, number>()
  const patientsByPsychologist = new Map<string, number>()
  const activePatientsByPsychologist = new Map<string, number>()
  const responsesByPsychologist = new Map<string, number>()
  const completedResponsesByPsychologist = new Map<string, number>()
  const pendingInvitationsByPsychologist = new Map<string, number>()
  const responsesByQuestionnaire = new Map<string, number>()
  const completedByQuestionnaire = new Map<string, number>()
  const draftByQuestionnaire = new Map<string, number>()
  const cancelledByQuestionnaire = new Map<string, number>()
  const statusCounts = new Map<string, number>()
  const monthlyResponses = new Map<string, { responses: number; completed: number }>()

  for (const user of users) {
    increment(usersByClinic, user.clinic_id)
    if (user.role === 'psychologist') increment(psychologistsByClinic, user.clinic_id)
  }

  for (const patient of patients) {
    increment(patientsByClinic, patient.clinic_id)
    increment(patientsByPsychologist, patient.responsible_psychologist_id)
    if (patient.is_active) {
      increment(activePatientsByClinic, patient.clinic_id)
      increment(activePatientsByPsychologist, patient.responsible_psychologist_id)
    }
  }

  for (const invitation of invitations) {
    if (invitation.status === 'pending') {
      increment(pendingInvitationsByClinic, invitation.clinic_id)
      increment(pendingInvitationsByPsychologist, invitation.responsible_psychologist_id)
    }
  }

  for (const response of responses) {
    const patient = patientById.get(response.patient_id)
    const psychologistId = patient?.responsible_psychologist_id
    increment(responsesByClinic, response.clinic_id)
    increment(responsesByPsychologist, psychologistId)
    increment(responsesByQuestionnaire, response.questionnaire_id)
    increment(statusCounts, response.status || 'sem_status')

    if (response.status === 'completed') {
      increment(completedResponsesByClinic, response.clinic_id)
      increment(completedResponsesByPsychologist, psychologistId)
      increment(completedByQuestionnaire, response.questionnaire_id)
    } else if (response.status === 'cancelled') {
      increment(cancelledByQuestionnaire, response.questionnaire_id)
    } else {
      increment(draftByQuestionnaire, response.questionnaire_id)
    }

    const key = monthKey(response.created_at)
    const current = monthlyResponses.get(key) ?? { responses: 0, completed: 0 }
    current.responses += 1
    if (response.status === 'completed') current.completed += 1
    monthlyResponses.set(key, current)
  }

  const clinicRows = clinics.map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    type: clinic.clinic_type ?? 'Clínica',
    is_active: clinic.is_active,
    users: usersByClinic.get(clinic.id) ?? 0,
    psychologists: psychologistsByClinic.get(clinic.id) ?? 0,
    patients: patientsByClinic.get(clinic.id) ?? 0,
    activePatients: activePatientsByClinic.get(clinic.id) ?? 0,
    responses: responsesByClinic.get(clinic.id) ?? 0,
    completedResponses: completedResponsesByClinic.get(clinic.id) ?? 0,
    pendingInvitations: pendingInvitationsByClinic.get(clinic.id) ?? 0,
  }))

  const psychologistRows = users
    .filter((user) => user.role === 'psychologist')
    .map((user) => ({
      id: user.id,
      name: user.full_name,
      email: user.email,
      clinicName: user.clinic_id ? clinicById.get(user.clinic_id)?.name ?? 'Clínica não localizada' : 'Sem clínica',
      is_active: user.is_active,
      can_receive_patients: user.can_receive_patients ?? true,
      patient_assignment_limit: user.patient_assignment_limit,
      patients: patientsByPsychologist.get(user.id) ?? 0,
      activePatients: activePatientsByPsychologist.get(user.id) ?? 0,
      pendingInvitations: pendingInvitationsByPsychologist.get(user.id) ?? 0,
      responses: responsesByPsychologist.get(user.id) ?? 0,
      completedResponses: completedResponsesByPsychologist.get(user.id) ?? 0,
    }))

  const questionnaireRows = questionnaires.map((questionnaire) => {
    const total = responsesByQuestionnaire.get(questionnaire.id) ?? 0
    const completed = completedByQuestionnaire.get(questionnaire.id) ?? 0
    return {
      id: questionnaire.id,
      code: questionnaire.code,
      name: questionnaire.name,
      clinical_status: questionnaire.clinical_status ?? 'draft',
      is_active: questionnaire.is_active,
      responses: total,
      completedResponses: completed,
      draftResponses: draftByQuestionnaire.get(questionnaire.id) ?? 0,
      cancelledResponses: cancelledByQuestionnaire.get(questionnaire.id) ?? 0,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    }
  })

  const monthRows = lastMonthKeys(12).map((key) => ({
    label: monthLabel(key),
    responses: monthlyResponses.get(key)?.responses ?? 0,
    completed: monthlyResponses.get(key)?.completed ?? 0,
  }))

  const completedResponses = responses.filter((response) => response.status === 'completed').length
  const draftResponses = responses.filter((response) => response.status === 'draft').length
  const cancelledResponses = responses.filter((response) => response.status === 'cancelled').length

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      clinics: clinics.length,
      activeClinics: clinics.filter((clinic) => clinic.is_active).length,
      users: users.length,
      psychologists: psychologistRows.length,
      patients: patients.length,
      activePatients: patients.filter((patient) => patient.is_active).length,
      questionnaires: questionnaires.length,
      responses: responses.length,
      completedResponses,
      draftResponses,
      cancelledResponses,
      pendingInvitations: invitations.filter((invitation) => invitation.status === 'pending').length,
      responseCompletionRate: responses.length ? Math.round((completedResponses / responses.length) * 100) : 0,
    },
    clinicRows: clinicRows.sort((a, b) => b.patients - a.patients),
    psychologistRows: psychologistRows.sort((a, b) => b.activePatients - a.activePatients),
    questionnaireRows: questionnaireRows.sort((a, b) => b.responses - a.responses),
    monthlyResponses: monthRows,
    responseStatusRows: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
  }
}

export async function getPatientOverviewData(): Promise<PatientOverviewData> {
  const client = getSupabase()
  const [clinicsResult, psychologistsResult, patientsResult, responsesResult] = await Promise.all([
    client.from('clinics').select('id, name').order('name'),
    client.from('profiles').select('id, clinic_id, full_name, is_active').eq('role', 'psychologist'),
    client.from('patients').select('id, clinic_id, responsible_psychologist_id, is_active, profile_id, created_at'),
    client.from('questionnaire_responses').select('id, patient_id, status'),
  ])

  ;[clinicsResult, psychologistsResult, patientsResult, responsesResult].forEach((result) => throwIfError(result.error))

  const clinics = (clinicsResult.data ?? []) as Array<{ id: string; name: string }>
  const psychologists = (psychologistsResult.data ?? []) as Array<{ id: string; clinic_id: string | null; full_name: string; is_active: boolean }>
  const patients = (patientsResult.data ?? []) as Array<{
    id: string
    clinic_id: string
    responsible_psychologist_id: string | null
    is_active: boolean
    profile_id: string | null
    created_at: string
  }>
  const responses = (responsesResult.data ?? []) as Array<{ id: string; patient_id: string; status: string | null }>

  const clinicById = new Map(clinics.map((clinic) => [clinic.id, clinic.name]))
  const psychologistById = new Map(psychologists.map((psychologist) => [psychologist.id, psychologist]))
  const responsesByPatient = new Map<string, { total: number; completed: number }>()

  for (const response of responses) {
    const current = responsesByPatient.get(response.patient_id) ?? { total: 0, completed: 0 }
    current.total += 1
    if (response.status === 'completed') current.completed += 1
    responsesByPatient.set(response.patient_id, current)
  }

  const rowsByKey = new Map<string, PatientOverviewData['rows'][number]>()

  for (const patient of patients) {
    const psychologist = patient.responsible_psychologist_id ? psychologistById.get(patient.responsible_psychologist_id) : null
    const key = `${patient.clinic_id}:${psychologist?.id ?? 'unassigned'}`
    const current = rowsByKey.get(key) ?? {
      id: key,
      clinic_id: patient.clinic_id,
      clinic_name: clinicById.get(patient.clinic_id) ?? 'Clínica não encontrada',
      psychologist_id: psychologist?.id ?? null,
      psychologist_name: psychologist?.full_name ?? 'Sem responsável',
      totalPatients: 0,
      activePatients: 0,
      inactivePatients: 0,
      withAppAccess: 0,
      responses: 0,
      completedResponses: 0,
      lastPatientCreatedAt: null,
    }
    const responseStats = responsesByPatient.get(patient.id)

    current.totalPatients += 1
    if (patient.is_active) current.activePatients += 1
    else current.inactivePatients += 1
    if (patient.profile_id) current.withAppAccess += 1
    current.responses += responseStats?.total ?? 0
    current.completedResponses += responseStats?.completed ?? 0
    if (!current.lastPatientCreatedAt || new Date(patient.created_at) > new Date(current.lastPatientCreatedAt)) {
      current.lastPatientCreatedAt = patient.created_at
    }

    rowsByKey.set(key, current)
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      clinics: new Set(patients.map((patient) => patient.clinic_id)).size,
      psychologists: new Set(patients.map((patient) => patient.responsible_psychologist_id).filter(Boolean)).size,
      patients: patients.length,
      activePatients: patients.filter((patient) => patient.is_active).length,
      inactivePatients: patients.filter((patient) => !patient.is_active).length,
      withAppAccess: patients.filter((patient) => patient.profile_id).length,
      responses: responses.length,
      completedResponses: responses.filter((response) => response.status === 'completed').length,
    },
    rows: Array.from(rowsByKey.values()).sort((a, b) => b.activePatients - a.activePatients),
  }
}

type RawAuditEvent = {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  occurred_at: string
  clinic_id: string | null
  actor_profile_id: string | null
  metadata: Record<string, unknown> | null
}

function formatAuditActor(profile?: { full_name: string | null; email: string | null }) {
  if (!profile) return 'Sistema'
  return profile.full_name || profile.email || 'Usuário sem nome'
}

export async function getSettingsData(): Promise<SettingsData> {
  const client = getSupabase()
  const [
    clinics,
    activeClinics,
    platformAdmins,
    psychologists,
    patients,
    activePatients,
    questionnaires,
    approvedQuestionnaires,
    suspendedQuestionnaires,
    legalConsents,
    auditEventsCount,
    questionnaireRows,
    auditRows,
    clinicRows,
  ] = await Promise.all([
    client.from('clinics').select('id', { count: 'exact', head: true }),
    client.from('clinics').select('id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'platform_admin'),
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'psychologist'),
    client.from('patients').select('id', { count: 'exact', head: true }),
    client.from('patients').select('id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('questionnaires').select('id', { count: 'exact', head: true }),
    client.from('questionnaires').select('id', { count: 'exact', head: true }).eq('clinical_status', 'approved'),
    client.from('questionnaires').select('id', { count: 'exact', head: true }).eq('clinical_status', 'suspended'),
    client.from('legal_consents').select('id', { count: 'exact', head: true }),
    client.from('audit_events').select('id', { count: 'exact', head: true }),
    client.from('questionnaires').select('clinical_status'),
    client.from('audit_events').select('id, action, entity_type, entity_id, occurred_at, clinic_id, actor_profile_id, metadata').order('occurred_at', { ascending: false }).limit(12),
    client.from('clinics').select('id, name'),
  ])

  ;[
    clinics,
    activeClinics,
    platformAdmins,
    psychologists,
    patients,
    activePatients,
    questionnaires,
    approvedQuestionnaires,
    suspendedQuestionnaires,
    legalConsents,
    auditEventsCount,
    questionnaireRows,
    auditRows,
    clinicRows,
  ].forEach((result) => throwIfError(result.error))

  const rawAuditRows = (auditRows.data ?? []) as RawAuditEvent[]
  const actorIds = Array.from(new Set(rawAuditRows.map((row) => row.actor_profile_id).filter(Boolean))) as string[]
  const actorsResult = actorIds.length
    ? await client.from('profiles').select('id, full_name, email').in('id', actorIds)
    : { data: [], error: null }
  throwIfError(actorsResult.error)

  const actorsById = new Map((actorsResult.data ?? []).map((actor) => [actor.id as string, actor as { full_name: string | null; email: string | null }]))
  const clinicsById = new Map((clinicRows.data ?? []).map((clinic) => [clinic.id as string, clinic.name as string]))
  const governanceCounts = new Map<string, number>()

  for (const row of questionnaireRows.data ?? []) {
    const status = (row.clinical_status as string | null) ?? 'sem_status'
    governanceCounts.set(status, (governanceCounts.get(status) ?? 0) + 1)
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      clinics: clinics.count ?? 0,
      activeClinics: activeClinics.count ?? 0,
      platformAdmins: platformAdmins.count ?? 0,
      psychologists: psychologists.count ?? 0,
      patients: patients.count ?? 0,
      activePatients: activePatients.count ?? 0,
      questionnaires: questionnaires.count ?? 0,
      approvedQuestionnaires: approvedQuestionnaires.count ?? 0,
      suspendedQuestionnaires: suspendedQuestionnaires.count ?? 0,
      legalConsents: legalConsents.count ?? 0,
      auditEvents: auditEventsCount.count ?? 0,
    },
    questionnaireGovernance: Array.from(governanceCounts.entries()).map(([status, count]) => ({ status, count })),
    recentAuditEvents: rawAuditRows.map((row) => {
      const actor = row.actor_profile_id ? actorsById.get(row.actor_profile_id) : undefined
      return {
        id: row.id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        occurred_at: row.occurred_at,
        clinic_id: row.clinic_id,
        actor_profile_id: row.actor_profile_id,
        actor_name: formatAuditActor(actor),
        actor_email: actor?.email ?? null,
        clinic_name: row.clinic_id ? clinicsById.get(row.clinic_id) ?? 'Clínica não localizada' : null,
        metadata: row.metadata,
      }
    }),
  }
}
export async function getAuditData(): Promise<AuditData> {
  const client = getSupabase()
  const [auditRows, clinicRows] = await Promise.all([
    client
      .from('audit_events')
      .select('id, action, entity_type, entity_id, occurred_at, clinic_id, actor_profile_id, metadata')
      .order('occurred_at', { ascending: false })
      .limit(500),
    client.from('clinics').select('id, name').order('name'),
  ])

  throwIfError(auditRows.error)
  throwIfError(clinicRows.error)

  const rawAuditRows = (auditRows.data ?? []) as RawAuditEvent[]
  const actorIds = Array.from(new Set(rawAuditRows.map((row) => row.actor_profile_id).filter(Boolean))) as string[]
  const actorsResult = actorIds.length
    ? await client.from('profiles').select('id, full_name, email').in('id', actorIds).order('full_name')
    : { data: [], error: null }
  throwIfError(actorsResult.error)

  const actors = (actorsResult.data ?? []).map((actor) => ({
    id: actor.id as string,
    name: (actor.full_name as string | null) || (actor.email as string | null) || 'Usuário sem nome',
    email: (actor.email as string | null) ?? null,
  }))
  const actorsById = new Map(actors.map((actor) => [actor.id, actor]))
  const clinics = (clinicRows.data ?? []).map((clinic) => ({ id: clinic.id as string, name: clinic.name as string }))
  const clinicsById = new Map(clinics.map((clinic) => [clinic.id, clinic.name]))

  const events = rawAuditRows.map((row) => {
    const actor = row.actor_profile_id ? actorsById.get(row.actor_profile_id) : undefined
    return {
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      occurred_at: row.occurred_at,
      clinic_id: row.clinic_id,
      actor_profile_id: row.actor_profile_id,
      actor_name: actor?.name ?? 'Sistema',
      actor_email: actor?.email ?? null,
      clinic_name: row.clinic_id ? clinicsById.get(row.clinic_id) ?? 'Clínica não localizada' : null,
      metadata: row.metadata,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    events,
    clinics,
    actors,
    actions: Array.from(new Set(events.map((event) => event.action))).sort(),
    entityTypes: Array.from(new Set(events.map((event) => event.entity_type))).sort(),
  }
}
export async function getClinicDetail(clinicId: string): Promise<ClinicDetailData> {
  const client = getSupabase()
  const [clinicResult, usersResult, patientsResult, responsesResult, invitationsResult, accessResult, questionnairesResult, auditRows] = await Promise.all([
    client.from('clinics').select('id, name, document, email, phone, clinic_type, is_active, created_at, updated_at').eq('id', clinicId).single(),
    client
      .from('profiles')
      .select('id, clinic_id, full_name, email, phone, role, crp, is_active, can_receive_patients, patient_assignment_limit, created_at')
      .eq('clinic_id', clinicId)
      .in('role', ['platform_admin', 'psychologist'])
      .order('full_name'),
    client
      .from('patients')
      .select('id, clinic_id, profile_id, responsible_psychologist_id, full_name, email, phone, cpf, birth_date, gender, relationship_status, education_level, occupation, country_birth, state_birth, religious_orientation, ethnic_group, sexual_orientation, has_children, is_active, inactivated_at, results_released_at, results_released_by, created_at')
      .eq('clinic_id', clinicId)
      .order('full_name'),
    client.from('questionnaire_responses').select('id, clinic_id, patient_id, questionnaire_id, status, created_at, completed_at').eq('clinic_id', clinicId),
    client.from('patient_invitations').select('id, clinic_id, responsible_psychologist_id, status, created_at').eq('clinic_id', clinicId),
    client.from('questionnaire_professional_access').select('id, clinic_id, questionnaire_id, professional_id, is_enabled').eq('clinic_id', clinicId).eq('is_enabled', true),
    client.from('questionnaires').select('id, code, name, is_active, clinical_status').order('name'),
    client.from('audit_events').select('id, action, entity_type, entity_id, occurred_at, clinic_id, actor_profile_id, metadata').eq('clinic_id', clinicId).order('occurred_at', { ascending: false }).limit(20),
  ])

  ;[clinicResult, usersResult, patientsResult, responsesResult, invitationsResult, accessResult, questionnairesResult, auditRows].forEach((result) => throwIfError(result.error))

  const clinic = clinicResult.data as Clinic
  const users = (usersResult.data ?? []) as UserProfile[]
  const patients = (patientsResult.data ?? []) as Patient[]
  const responses = (responsesResult.data ?? []) as ReportResponseRow[]
  const invitations = (invitationsResult.data ?? []) as Array<{ id: string; clinic_id: string; responsible_psychologist_id: string | null; status: string; created_at: string }>
  const accessRows = (accessResult.data ?? []) as Array<{ id: string; clinic_id: string; questionnaire_id: string; professional_id: string; is_enabled: boolean }>
  const questionnaires = (questionnairesResult.data ?? []) as Array<{ id: string; code: string; name: string; is_active: boolean; clinical_status: string | null }>
  const rawAuditRows = (auditRows.data ?? []) as RawAuditEvent[]

  const activePatientsByPsychologist = new Map<string, number>()
  const pendingInvitationsByPsychologist = new Map<string, number>()
  const responsesByQuestionnaire = new Map<string, number>()
  const completedByQuestionnaire = new Map<string, number>()
  const draftByQuestionnaire = new Map<string, number>()
  const cancelledByQuestionnaire = new Map<string, number>()
  const monthlyResponses = new Map<string, { responses: number; completed: number }>()

  for (const patient of patients) {
    if (patient.is_active) increment(activePatientsByPsychologist, patient.responsible_psychologist_id)
  }

  for (const invitation of invitations) {
    if (invitation.status === 'pending') increment(pendingInvitationsByPsychologist, invitation.responsible_psychologist_id)
  }

  for (const response of responses) {
    increment(responsesByQuestionnaire, response.questionnaire_id)
    if (response.status === 'completed') increment(completedByQuestionnaire, response.questionnaire_id)
    else if (response.status === 'cancelled') increment(cancelledByQuestionnaire, response.questionnaire_id)
    else increment(draftByQuestionnaire, response.questionnaire_id)

    const key = monthKey(response.created_at)
    const current = monthlyResponses.get(key) ?? { responses: 0, completed: 0 }
    current.responses += 1
    if (response.status === 'completed') current.completed += 1
    monthlyResponses.set(key, current)
  }

  const questionnaireIdsWithAccess = new Set(accessRows.map((row) => row.questionnaire_id))
  const questionnaireIdsWithResponses = new Set(responses.map((row) => row.questionnaire_id))
  const relevantQuestionnaires = questionnaires.filter((questionnaire) => questionnaireIdsWithAccess.has(questionnaire.id) || questionnaireIdsWithResponses.has(questionnaire.id))

  const actorIds = Array.from(new Set(rawAuditRows.map((row) => row.actor_profile_id).filter(Boolean))) as string[]
  const actorsResult = actorIds.length
    ? await client.from('profiles').select('id, full_name, email').in('id', actorIds)
    : { data: [], error: null }
  throwIfError(actorsResult.error)
  const actorsById = new Map((actorsResult.data ?? []).map((actor) => [actor.id as string, actor as { full_name: string | null; email: string | null }]))

  const enrichedUsers = users.map((user) => ({
    ...user,
    clinic,
    assigned_patients_count: activePatientsByPsychologist.get(user.id) ?? 0,
    pending_patient_invitations_count: pendingInvitationsByPsychologist.get(user.id) ?? 0,
  }))

  const questionnaireRows = relevantQuestionnaires.map((questionnaire) => {
    const total = responsesByQuestionnaire.get(questionnaire.id) ?? 0
    const completed = completedByQuestionnaire.get(questionnaire.id) ?? 0
    return {
      id: questionnaire.id,
      code: questionnaire.code,
      name: questionnaire.name,
      clinical_status: questionnaire.clinical_status ?? 'draft',
      is_active: questionnaire.is_active,
      responses: total,
      completedResponses: completed,
      draftResponses: draftByQuestionnaire.get(questionnaire.id) ?? 0,
      cancelledResponses: cancelledByQuestionnaire.get(questionnaire.id) ?? 0,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    }
  }).sort((a, b) => b.responses - a.responses)

  const auditEvents = rawAuditRows.map((row) => {
    const actor = row.actor_profile_id ? actorsById.get(row.actor_profile_id) : undefined
    return {
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      occurred_at: row.occurred_at,
      clinic_id: row.clinic_id,
      actor_profile_id: row.actor_profile_id,
      actor_name: formatAuditActor(actor),
      actor_email: actor?.email ?? null,
      clinic_name: clinic.name,
      metadata: row.metadata,
    }
  })

  return {
    clinic,
    totals: {
      users: users.length,
      psychologists: users.filter((user) => user.role === 'psychologist').length,
      patients: patients.length,
      activePatients: patients.filter((patient) => patient.is_active).length,
      responses: responses.length,
      completedResponses: responses.filter((response) => response.status === 'completed').length,
      pendingInvitations: invitations.filter((invitation) => invitation.status === 'pending').length,
      questionnaireAccess: accessRows.length,
    },
    users: enrichedUsers,
    patients: patients.map((patient) => ({
      ...patient,
      responsible_psychologist: patient.responsible_psychologist_id
        ? { full_name: users.find((user) => user.id === patient.responsible_psychologist_id)?.full_name ?? 'Sem responsável' }
        : null,
      access_profile: patient.profile_id ? { is_active: true } : null,
    })),
    questionnaireRows,
    monthlyResponses: lastMonthKeys(12).map((key) => ({
      label: monthLabel(key),
      responses: monthlyResponses.get(key)?.responses ?? 0,
      completed: monthlyResponses.get(key)?.completed ?? 0,
    })),
    auditEvents,
  }
}
export async function getPsychologistDetail(psychologistId: string): Promise<PsychologistDetailData> {
  const client = getSupabase()
  const [profileResult, patientsResult, invitationsResult, accessResult, questionnairesResult, auditRows] = await Promise.all([
    client
      .from('profiles')
      .select('id, clinic_id, full_name, email, phone, role, crp, is_active, can_receive_patients, patient_assignment_limit, created_at')
      .eq('id', psychologistId)
      .eq('role', 'psychologist')
      .single(),
    client
      .from('patients')
      .select('id, clinic_id, profile_id, responsible_psychologist_id, full_name, email, phone, cpf, birth_date, gender, relationship_status, education_level, occupation, country_birth, state_birth, religious_orientation, ethnic_group, sexual_orientation, has_children, is_active, inactivated_at, results_released_at, results_released_by, created_at')
      .eq('responsible_psychologist_id', psychologistId)
      .order('full_name'),
    client.from('patient_invitations').select('id, clinic_id, responsible_psychologist_id, status, created_at').eq('responsible_psychologist_id', psychologistId),
    client.from('questionnaire_professional_access').select('id, clinic_id, questionnaire_id, professional_id, is_enabled').eq('professional_id', psychologistId).eq('is_enabled', true),
    client.from('questionnaires').select('id, code, name, is_active, clinical_status').order('name'),
    client.from('audit_events').select('id, action, entity_type, entity_id, occurred_at, clinic_id, actor_profile_id, metadata').eq('actor_profile_id', psychologistId).order('occurred_at', { ascending: false }).limit(20),
  ])

  ;[profileResult, patientsResult, invitationsResult, accessResult, questionnairesResult, auditRows].forEach((result) => throwIfError(result.error))

  const psychologist = profileResult.data as UserProfile
  const patients = (patientsResult.data ?? []) as Patient[]
  const invitations = (invitationsResult.data ?? []) as Array<{ id: string; clinic_id: string; responsible_psychologist_id: string | null; status: string; created_at: string }>
  const accessRows = (accessResult.data ?? []) as Array<{ id: string; clinic_id: string; questionnaire_id: string; professional_id: string; is_enabled: boolean }>
  const questionnaires = (questionnairesResult.data ?? []) as Array<{ id: string; code: string; name: string; is_active: boolean; clinical_status: string | null }>
  const rawAuditRows = (auditRows.data ?? []) as RawAuditEvent[]

  const clinicResult = psychologist.clinic_id
    ? await client.from('clinics').select('id, name, document, email, phone, clinic_type, is_active, created_at, updated_at').eq('id', psychologist.clinic_id).maybeSingle()
    : { data: null, error: null }
  throwIfError(clinicResult.error)
  const clinic = (clinicResult.data ?? null) as Clinic | null

  const patientIds = patients.map((patient) => patient.id)
  const responsesResult = patientIds.length
    ? await client.from('questionnaire_responses').select('id, clinic_id, patient_id, questionnaire_id, status, created_at, completed_at').in('patient_id', patientIds)
    : { data: [], error: null }
  throwIfError(responsesResult.error)
  const responses = (responsesResult.data ?? []) as ReportResponseRow[]

  const responsesByQuestionnaire = new Map<string, number>()
  const completedByQuestionnaire = new Map<string, number>()
  const draftByQuestionnaire = new Map<string, number>()
  const cancelledByQuestionnaire = new Map<string, number>()
  const monthlyResponses = new Map<string, { responses: number; completed: number }>()

  for (const response of responses) {
    increment(responsesByQuestionnaire, response.questionnaire_id)
    if (response.status === 'completed') increment(completedByQuestionnaire, response.questionnaire_id)
    else if (response.status === 'cancelled') increment(cancelledByQuestionnaire, response.questionnaire_id)
    else increment(draftByQuestionnaire, response.questionnaire_id)

    const key = monthKey(response.created_at)
    const current = monthlyResponses.get(key) ?? { responses: 0, completed: 0 }
    current.responses += 1
    if (response.status === 'completed') current.completed += 1
    monthlyResponses.set(key, current)
  }

  const questionnaireIdsWithAccess = new Set(accessRows.map((row) => row.questionnaire_id))
  const questionnaireIdsWithResponses = new Set(responses.map((row) => row.questionnaire_id))
  const relevantQuestionnaires = questionnaires.filter((questionnaire) => questionnaireIdsWithAccess.has(questionnaire.id) || questionnaireIdsWithResponses.has(questionnaire.id))
  const questionnaireRows = relevantQuestionnaires.map((questionnaire) => {
    const total = responsesByQuestionnaire.get(questionnaire.id) ?? 0
    const completed = completedByQuestionnaire.get(questionnaire.id) ?? 0
    return {
      id: questionnaire.id,
      code: questionnaire.code,
      name: questionnaire.name,
      clinical_status: questionnaire.clinical_status ?? 'draft',
      is_active: questionnaire.is_active,
      responses: total,
      completedResponses: completed,
      draftResponses: draftByQuestionnaire.get(questionnaire.id) ?? 0,
      cancelledResponses: cancelledByQuestionnaire.get(questionnaire.id) ?? 0,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    }
  }).sort((a, b) => b.responses - a.responses)

  const auditEvents = rawAuditRows.map((row) => ({
    id: row.id,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    occurred_at: row.occurred_at,
    clinic_id: row.clinic_id,
    actor_profile_id: row.actor_profile_id,
    actor_name: psychologist.full_name,
    actor_email: psychologist.email,
    clinic_name: clinic?.name ?? null,
    metadata: row.metadata,
  }))

  const activePatients = patients.filter((patient) => patient.is_active).length
  const pendingInvitations = invitations.filter((invitation) => invitation.status === 'pending').length
  const capacityUsed = activePatients + pendingInvitations

  return {
    psychologist: {
      ...psychologist,
      clinic,
      assigned_patients_count: activePatients,
      pending_patient_invitations_count: pendingInvitations,
    },
    clinic,
    totals: {
      patients: patients.length,
      activePatients,
      pendingInvitations,
      responses: responses.length,
      completedResponses: responses.filter((response) => response.status === 'completed').length,
      questionnaireAccess: accessRows.length,
      capacityUsed,
    },
    patients: patients.map((patient) => ({
      ...patient,
      responsible_psychologist: { full_name: psychologist.full_name },
      access_profile: patient.profile_id ? { is_active: true } : null,
    })),
    questionnaireRows,
    monthlyResponses: lastMonthKeys(12).map((key) => ({
      label: monthLabel(key),
      responses: monthlyResponses.get(key)?.responses ?? 0,
      completed: monthlyResponses.get(key)?.completed ?? 0,
    })),
    auditEvents,
  }
}
export async function getPatientDetail(patientId: string): Promise<PatientDetailData> {
  const client = getSupabase()
  const [patientResult, responsesResult, problemsResult, goalsResult, checkInsResult, dailyMonitorsResult, timelineResult, assignmentsResult, auditRows] = await Promise.all([
    client
      .from('patients')
      .select('id, clinic_id, profile_id, responsible_psychologist_id, full_name, email, phone, cpf, birth_date, gender, relationship_status, education_level, occupation, country_birth, state_birth, religious_orientation, ethnic_group, sexual_orientation, has_children, intake_summary, current_life_context, therapy_demands, is_active, inactivated_at, created_at')
      .eq('id', patientId)
      .single(),
    client
      .from('questionnaire_responses')
      .select('id, clinic_id, patient_id, questionnaire_id, status, created_at, completed_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
    client.from('patient_problems').select('id, clinic_id, patient_id, created_by, title, description, category, intensity, status, identified_at, resolved_at, created_at, updated_at').eq('patient_id', patientId).order('updated_at', { ascending: false }),
    client.from('therapy_goals').select('id, clinic_id, patient_id, created_by, title, description, status, target_date, completed_at, progress, linked_schemas, created_at, updated_at').eq('patient_id', patientId).order('updated_at', { ascending: false }),
    client.from('patient_check_ins').select('id, mood_score, anxiety_score, energy_score, problem_intensity_score, notes, checked_in_at').eq('patient_id', patientId).order('checked_in_at', { ascending: false }).limit(30),
    client.from('daily_monitors').select('id, mood_notes, sleep_notes, activity_notes, emotion_notes, created_at').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(30),
    client.from('patient_timeline_events').select('id, clinic_id, patient_id, created_by, title, description, event_date, period_label, category, emotional_impact, is_sensitive, created_at, updated_at').eq('patient_id', patientId).order('event_date', { ascending: false, nullsFirst: false }).limit(50),
    client.from('patient_questionnaire_assignments').select('id, questionnaire_id, assigned_by_profile_id, assigned_at, message, response_id, cancelled_at').eq('patient_id', patientId).order('assigned_at', { ascending: false }),
    client
      .from('audit_events')
      .select('id, action, entity_type, entity_id, patient_id, occurred_at, clinic_id, actor_profile_id, metadata')
      .or(`patient_id.eq.${patientId},entity_id.eq.${patientId}`)
      .order('occurred_at', { ascending: false })
      .limit(30),
  ])

  ;[patientResult, responsesResult, problemsResult, goalsResult, checkInsResult, dailyMonitorsResult, timelineResult, assignmentsResult, auditRows].forEach((result) => throwIfError(result.error))

  const patient = patientResult.data as Patient
  const responses = (responsesResult.data ?? []) as ReportResponseRow[]
  const responseIds = responses.map((response) => response.id)
  const questionnaireIds = Array.from(new Set(responses.map((response) => response.questionnaire_id)))
  const activeAssignments = ((assignmentsResult.data ?? []) as PatientDetailData['questionnaireAssignments']).filter((assignment) => !assignment.cancelled_at)
  const assignmentQuestionnaireIds = activeAssignments.map((assignment) => assignment.questionnaire_id)
  const [clinicResult, psychologistResult, questionnairesResult, resourcesResult, resourceAccessResult, accessResult] = await Promise.all([
    client.from('clinics').select('id, name, document, email, phone, clinic_type, is_active, created_at, updated_at').eq('id', patient.clinic_id).maybeSingle(),
    patient.responsible_psychologist_id
      ? client.from('profiles').select('id, clinic_id, full_name, email, phone, role, crp, is_active, can_receive_patients, patient_assignment_limit, created_at').eq('id', patient.responsible_psychologist_id).maybeSingle()
      : { data: null, error: null },
    Array.from(new Set([...questionnaireIds, ...assignmentQuestionnaireIds])).length
      ? client.from('questionnaires').select('id, code, name, description, is_active, clinical_status').in('id', Array.from(new Set([...questionnaireIds, ...assignmentQuestionnaireIds])))
      : { data: [], error: null },
    client.from('therapy_resources').select('id, title, type, description, url, is_active').eq('clinic_id', patient.clinic_id).eq('is_active', true).order('title'),
    client.from('patient_resource_access').select('resource_id, is_active').eq('patient_id', patientId).eq('is_active', true),
    patient.responsible_psychologist_id
      ? client.from('questionnaire_professional_access').select('questionnaire_id, is_enabled').eq('professional_id', patient.responsible_psychologist_id).eq('is_enabled', true)
      : { data: [], error: null },
  ])

  throwIfError(clinicResult.error)
  throwIfError(psychologistResult.error)
  throwIfError(questionnairesResult.error)
  throwIfError(resourcesResult.error)
  throwIfError(resourceAccessResult.error)
  throwIfError(accessResult.error)

  const clinic = (clinicResult.data ?? null) as Clinic | null
  const psychologist = (psychologistResult.data ?? null) as UserProfile | null
  const accessQuestionnaireIds = Array.from(new Set((accessResult.data ?? []).map((row) => row.questionnaire_id as string)))
  const accessQuestionnairesResult = accessQuestionnaireIds.length
    ? await client.from('questionnaires').select('id, code, name, description, is_active, clinical_status').in('id', accessQuestionnaireIds).eq('is_active', true).order('name')
    : { data: [], error: null }
  throwIfError(accessQuestionnairesResult.error)

  const [responseResultsResult, responseAnswersResult] = await Promise.all([
    responseIds.length
      ? client
          .from('questionnaire_results')
          .select('id, response_id, category_id, total_score, average_score, classification, professional_average_score, professional_note, category:question_categories(id, code, name)')
          .in('response_id', responseIds)
      : { data: [], error: null },
    responseIds.length
      ? client
          .from('questionnaire_answers')
          .select('id, response_id, question_id, answer_value, professional_value, professional_note, response_context:questionnaire_response_contexts(context_label), question:questions(id, code, text, order_index, answer_type, scale_min, scale_max)')
          .in('response_id', responseIds)
      : { data: [], error: null },
  ])
  throwIfError(responseResultsResult.error)
  throwIfError(responseAnswersResult.error)

  const questionnairesById = new Map((questionnairesResult.data ?? []).map((questionnaire) => [
    questionnaire.id as string,
    questionnaire as { id: string; code: string; name: string; description?: string | null; is_active: boolean; clinical_status: string | null },
  ]))
  const monthlyResponses = new Map<string, { responses: number; completed: number }>()

  for (const response of responses) {
    const key = monthKey(response.created_at)
    const current = monthlyResponses.get(key) ?? { responses: 0, completed: 0 }
    current.responses += 1
    if (response.status === 'completed') current.completed += 1
    monthlyResponses.set(key, current)
  }

  const rawAuditRows = (auditRows.data ?? []) as RawAuditEvent[]
  const actorIds = Array.from(new Set(rawAuditRows.map((row) => row.actor_profile_id).filter(Boolean))) as string[]
  const actorsResult = actorIds.length
    ? await client.from('profiles').select('id, full_name, email').in('id', actorIds)
    : { data: [], error: null }
  throwIfError(actorsResult.error)
  const actorsById = new Map((actorsResult.data ?? []).map((actor) => [actor.id as string, actor as { full_name: string | null; email: string | null }]))

  const completedResponses = responses.filter((response) => response.status === 'completed').length
  const draftResponses = responses.filter((response) => response.status === 'draft').length
  const cancelledResponses = responses.filter((response) => response.status === 'cancelled').length

  const problems = (problemsResult.data ?? []) as PatientDetailData['problems']
  const goals = (goalsResult.data ?? []) as PatientDetailData['goals']
  const checkIns = (checkInsResult.data ?? []) as PatientDetailData['checkIns']
  const dailyMonitors = (dailyMonitorsResult.data ?? []) as PatientDetailData['dailyMonitors']
  const timelineEvents = (timelineResult.data ?? []) as PatientDetailData['timelineEvents']
  const questionnaireAssignments = (assignmentsResult.data ?? []) as PatientDetailData['questionnaireAssignments']
  const releasedResourceIds = new Set((resourceAccessResult.data ?? []).map((row) => row.resource_id as string))
  const activeAssignedIds = new Set(activeAssignments.map((assignment) => assignment.questionnaire_id))

  return {
    patient: {
      ...patient,
      responsible_psychologist: psychologist ? { full_name: psychologist.full_name } : null,
      access_profile: patient.profile_id ? { is_active: patient.is_active } : null,
    },
    clinic,
    psychologist: psychologist ? { ...psychologist, clinic } : null,
    totals: {
      responses: responses.length,
      completedResponses,
      draftResponses,
      cancelledResponses,
      problems: problems.length,
      activeProblems: problems.filter((problem) => problem.status === 'active').length,
      goals: goals.length,
      activeGoals: goals.filter((goal) => goal.status === 'active').length,
      checkIns: checkIns.length,
      dailyMonitors: dailyMonitors.length,
      auditEvents: rawAuditRows.length,
    },
    responses: responses.map((response) => {
      const questionnaire = questionnairesById.get(response.questionnaire_id)
      return {
        id: response.id,
        questionnaire_id: response.questionnaire_id,
        questionnaire_name: questionnaire?.name ?? 'Questionário não localizado',
        questionnaire_code: questionnaire?.code ?? '-',
        status: response.status,
        created_at: response.created_at,
        completed_at: response.completed_at,
      }
    }),
    responseResults: (responseResultsResult.data ?? []).map((result) => {
      const category = Array.isArray(result.category) ? result.category[0] : result.category
      return {
        id: result.id as string,
        response_id: result.response_id as string,
        category_id: result.category_id as string | null,
        category_code: category?.code as string | null,
        category_name: category?.name as string | null,
        total_score: result.total_score == null ? null : Number(result.total_score),
        average_score: result.average_score == null ? null : Number(result.average_score),
        classification: result.classification as string | null,
        professional_average_score: result.professional_average_score == null ? null : Number(result.professional_average_score),
        professional_note: result.professional_note as string | null,
      }
    }),
    responseAnswers: (responseAnswersResult.data ?? []).map((answer) => {
      const question = Array.isArray(answer.question) ? answer.question[0] : answer.question
      const context = Array.isArray(answer.response_context) ? answer.response_context[0] : answer.response_context
      return {
        id: answer.id as string,
        response_id: answer.response_id as string,
        question_id: answer.question_id as string,
        question_code: question?.code as string ?? '-',
        question_text: question?.text as string ?? '',
        order_index: Number(question?.order_index ?? 0),
        answer_type: question?.answer_type as string ?? 'likert_scale',
        scale_min: question?.scale_min == null ? null : Number(question.scale_min),
        scale_max: question?.scale_max == null ? null : Number(question.scale_max),
        answer_value: answer.answer_value == null ? null : Number(answer.answer_value),
        professional_value: answer.professional_value == null ? null : Number(answer.professional_value),
        professional_note: answer.professional_note as string | null,
        context_label: context?.context_label as string | null,
      }
    }).sort((a, b) => a.order_index - b.order_index),
    problems,
    goals,
    checkIns,
    dailyMonitors,
    timelineEvents,
    questionnaireAssignments,
    availableQuestionnaires: (accessQuestionnairesResult.data ?? []).map((questionnaire) => ({
      id: questionnaire.id as string,
      code: questionnaire.code as string,
      name: questionnaire.name as string,
      description: questionnaire.description as string | null,
      clinical_status: questionnaire.clinical_status as string | null,
      is_active: Boolean(questionnaire.is_active),
      is_assigned: activeAssignedIds.has(questionnaire.id as string),
    })),
    resources: (resourcesResult.data ?? []).map((resource) => ({
      ...resource,
      is_released: releasedResourceIds.has(resource.id as string),
    })) as PatientDetailData['resources'],
    monthlyResponses: lastMonthKeys(12).map((key) => ({
      label: monthLabel(key),
      responses: monthlyResponses.get(key)?.responses ?? 0,
      completed: monthlyResponses.get(key)?.completed ?? 0,
    })),
    auditEvents: rawAuditRows.map((row) => {
      const actor = row.actor_profile_id ? actorsById.get(row.actor_profile_id) : undefined
      return {
        id: row.id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        occurred_at: row.occurred_at,
        clinic_id: row.clinic_id,
        actor_profile_id: row.actor_profile_id,
        actor_name: formatAuditActor(actor),
        actor_email: actor?.email ?? null,
        clinic_name: clinic?.name ?? null,
        metadata: row.metadata,
      }
    }),
  }
}

export async function getPatientPortalResults(): Promise<PatientPortalResultsData> {
  const client = getSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  throwIfError(userError)
  const userId = userData.user?.id
  if (!userId) throw new Error('Sessão não encontrada.')

  const patientResult = await client
    .from('patients')
    .select('id, full_name, results_released_at, created_at')
    .eq('profile_id', userId)
    .maybeSingle()
  throwIfError(patientResult.error)

  const patient = patientResult.data as PatientPortalResultsData['patient'] | null
  if (!patient) throw new Error('Paciente não encontrado para este usuário.')

  const responsesResult = await client
    .from('questionnaire_responses')
    .select('id, questionnaire_id, status, created_at, completed_at')
    .eq('patient_id', patient.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false, nullsFirst: false })
  throwIfError(responsesResult.error)

  const responses = (responsesResult.data ?? []) as Array<{
    id: string
    questionnaire_id: string
    status: string
    created_at: string
    completed_at: string | null
  }>
  const questionnaireIds = Array.from(new Set(responses.map((response) => response.questionnaire_id)))
  const responseIds = responses.map((response) => response.id)

  const questionnairesResult = questionnaireIds.length
    ? await client.from('questionnaires').select('id, code, name').in('id', questionnaireIds)
    : { data: [], error: null }
  throwIfError(questionnairesResult.error)

  const resultsResult = patient.results_released_at && responseIds.length
    ? await client
        .from('questionnaire_results')
        .select('id, response_id, category_id, total_score, average_score, classification, category:question_categories(id, code, name)')
        .in('response_id', responseIds)
    : { data: [], error: null }
  throwIfError(resultsResult.error)

  const questionnairesById = new Map((questionnairesResult.data ?? []).map((questionnaire) => [
    questionnaire.id as string,
    questionnaire as { id: string; code: string; name: string },
  ]))

  return {
    patient,
    responses: responses.map((response) => {
      const questionnaire = questionnairesById.get(response.questionnaire_id)
      return {
        id: response.id,
        questionnaire_id: response.questionnaire_id,
        questionnaire_name: questionnaire?.name ?? 'Questionário',
        questionnaire_code: questionnaire?.code ?? '-',
        status: response.status,
        created_at: response.created_at,
        completed_at: response.completed_at,
      }
    }),
    responseResults: (resultsResult.data ?? []).map((result) => {
      const category = Array.isArray(result.category) ? result.category[0] : result.category
      return {
        id: result.id as string,
        response_id: result.response_id as string,
        category_id: result.category_id as string | null,
        category_code: category?.code as string | null,
        category_name: category?.name as string | null,
        total_score: result.total_score == null ? null : Number(result.total_score),
        average_score: result.average_score == null ? null : Number(result.average_score),
        classification: result.classification as string | null,
        professional_average_score: null,
        professional_note: null,
      }
    }),
  }
}

async function getCurrentPatientId(client = getSupabase()) {
  const { data: userData, error: userError } = await client.auth.getUser()
  throwIfError(userError)
  const userId = userData.user?.id
  if (!userId) throw new Error('Sessão não encontrada.')

  const { data, error } = await client
    .from('patients')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()
  throwIfError(error)
  if (!data?.id) throw new Error('Paciente não encontrado para este usuário.')
  return data.id as string
}

async function getCurrentPatientContext(client = getSupabase()) {
  const { data: userData, error: userError } = await client.auth.getUser()
  throwIfError(userError)
  const userId = userData.user?.id
  if (!userId) throw new Error('Sessão não encontrada.')

  const { data, error } = await client
    .from('patients')
    .select('id, clinic_id')
    .eq('profile_id', userId)
    .maybeSingle()
  throwIfError(error)
  if (!data?.id || !data?.clinic_id) throw new Error('Paciente não encontrado para este usuário.')
  return { patientId: data.id as string, clinicId: data.clinic_id as string }
}

export async function listPatientPortalQuestionnaires(): Promise<PatientPortalQuestionnaireAssignment[]> {
  const client = getSupabase()
  const patientId = await getCurrentPatientId(client)
  const { data: assignmentsData, error: assignmentsError } = await client
    .from('patient_questionnaire_assignments')
    .select('id, patient_id, questionnaire_id, assigned_at, message, response_id')
    .eq('patient_id', patientId)
    .is('cancelled_at', null)
    .order('assigned_at', { ascending: false })
  throwIfError(assignmentsError)

  const assignments = (assignmentsData ?? []) as Array<{
    id: string
    patient_id: string
    questionnaire_id: string
    assigned_at: string
    message: string | null
    response_id: string | null
  }>
  const questionnaireIds = Array.from(new Set(assignments.map((assignment) => assignment.questionnaire_id)))
  const responseIds = Array.from(new Set(assignments.map((assignment) => assignment.response_id).filter(Boolean))) as string[]

  const [questionnairesResult, responsesResult] = await Promise.all([
    questionnaireIds.length
      ? client.from('questionnaires').select('id, code, name, description').in('id', questionnaireIds)
      : { data: [], error: null },
    responseIds.length
      ? client.from('questionnaire_responses').select('id, status, completed_at').in('id', responseIds)
      : { data: [], error: null },
  ])
  throwIfError(questionnairesResult.error)
  throwIfError(responsesResult.error)

  const questionnairesById = new Map((questionnairesResult.data ?? []).map((questionnaire) => [
    questionnaire.id as string,
    questionnaire as { id: string; code: string; name: string; description: string | null },
  ]))
  const responsesById = new Map((responsesResult.data ?? []).map((response) => [
    response.id as string,
    response as { id: string; status: string; completed_at: string | null },
  ]))

  return assignments.map((assignment) => {
    const questionnaire = questionnairesById.get(assignment.questionnaire_id)
    const response = assignment.response_id ? responsesById.get(assignment.response_id) : null
    return {
      id: assignment.id,
      patient_id: assignment.patient_id,
      questionnaire_id: assignment.questionnaire_id,
      assigned_at: assignment.assigned_at,
      message: assignment.message,
      response_id: assignment.response_id,
      questionnaire_name: questionnaire?.name ?? 'Questionário',
      questionnaire_code: questionnaire?.code ?? '-',
      questionnaire_description: questionnaire?.description ?? null,
      response_status: response?.status ?? null,
      response_completed_at: response?.completed_at ?? null,
    }
  })
}

function normalizeSession(payload: unknown, patientId: string): QuestionnaireSessionData {
  const root = (payload as { data?: unknown })?.data ?? payload
  const data = root as {
    response?: Record<string, unknown>
    questionnaire?: Record<string, unknown>
    questions?: Array<Record<string, unknown>>
    contexts?: Array<Record<string, unknown>>
    answers?: Array<Record<string, unknown>>
  }
  const response = data.response ?? {}
  const questionnaire = data.questionnaire ?? {}

  return {
    response_id: String(response.id ?? ''),
    patient_id: String(response.patient_id ?? patientId),
    questionnaire_id: String(questionnaire.id ?? response.questionnaire_id ?? ''),
    questionnaire_code: String(questionnaire.code ?? '-'),
    questionnaire_name: String(questionnaire.name ?? 'Questionário'),
    status: String(response.status ?? 'draft'),
    questions: (data.questions ?? []).map((question) => ({
      id: String(question.id ?? ''),
      code: String(question.code ?? '-'),
      text: String(question.text ?? ''),
      order_index: Number(question.order_index ?? 0),
      answer_type: String(question.answer_type ?? 'likert_scale'),
      scale_min: question.scale_min == null ? null : Number(question.scale_min),
      scale_max: question.scale_max == null ? null : Number(question.scale_max),
    })).sort((a, b) => a.order_index - b.order_index),
    contexts: (data.contexts ?? []).map((context) => ({
      id: String(context.id ?? ''),
      context_key: String(context.context_key ?? ''),
      context_label: String(context.context_label ?? 'Contexto'),
      sort_order: Number(context.sort_order ?? 0),
    })).sort((a, b) => a.sort_order - b.sort_order),
    answers: (data.answers ?? []).map((answer) => ({
      id: String(answer.id ?? ''),
      question_id: String(answer.question_id ?? ''),
      response_context_id: answer.response_context_id == null ? null : String(answer.response_context_id),
      answer_value: Number(answer.answer_value),
    })),
  }
}

export async function startPatientQuestionnaire(input: {
  assignment_id: string
  patient_id: string
  questionnaire_id: string
  contexts?: Array<{ key: string; label: string }>
}): Promise<QuestionnaireSessionData> {
  const { data, error } = await getSupabase().functions.invoke('start-questionnaire', {
    body: {
      patient_id: input.patient_id,
      questionnaire_id: input.questionnaire_id,
      assignment_id: input.assignment_id,
      contexts: input.contexts ?? [],
    },
  })
  await throwIfFunctionError(error, 'start-questionnaire')
  return normalizeSession(data, input.patient_id)
}

export async function getQuestionnaireSession(responseId: string): Promise<QuestionnaireSessionData> {
  const client = getSupabase()
  const { data: response, error: responseError } = await client
    .from('questionnaire_responses')
    .select('id, patient_id, questionnaire_id, questionnaire_version_id, status, questionnaire:questionnaires(id, code, name)')
    .eq('id', responseId)
    .maybeSingle()
  throwIfError(responseError)
  if (!response) throw new Error('Resposta não encontrada.')
  if (response.status !== 'draft') throw new Error('Este questionário já foi finalizado.')

  const [questionsResult, contextsResult, answersResult] = await Promise.all([
    client
      .from('questions')
      .select('id, code, text, order_index, answer_type, scale_min, scale_max')
      .eq('questionnaire_version_id', response.questionnaire_version_id as string)
      .eq('is_active', true)
      .order('order_index', { ascending: true }),
    client
      .from('questionnaire_response_contexts')
      .select('id, context_key, context_label, sort_order')
      .eq('response_id', responseId)
      .order('sort_order', { ascending: true }),
    client
      .from('questionnaire_answers')
      .select('id, question_id, response_context_id, answer_value')
      .eq('response_id', responseId),
  ])
  throwIfError(questionsResult.error)
  throwIfError(contextsResult.error)
  throwIfError(answersResult.error)

  const questionnaire = Array.isArray(response.questionnaire) ? response.questionnaire[0] : response.questionnaire
  return normalizeSession({
    response,
    questionnaire,
    questions: questionsResult.data ?? [],
    contexts: contextsResult.data ?? [],
    answers: answersResult.data ?? [],
  }, response.patient_id as string)
}

export async function submitPatientQuestionnaireAnswer(input: {
  response_id: string
  question_id: string
  answer_value: number
  response_context_id?: string | null
}) {
  const { error } = await getSupabase().functions.invoke('submit-questionnaire-answer', {
    body: {
      response_id: input.response_id,
      question_id: input.question_id,
      answer_value: input.answer_value,
      ...(input.response_context_id ? { response_context_id: input.response_context_id } : {}),
    },
  })
  await throwIfFunctionError(error, 'submit-questionnaire-answer')
}

export async function finishPatientQuestionnaire(responseId: string) {
  const { error } = await getSupabase().functions.invoke('finish-questionnaire', {
    body: { response_id: responseId },
  })
  await throwIfFunctionError(error, 'finish-questionnaire')
}

export async function getPatientPortalMonitoring() {
  const client = getSupabase()
  const { patientId } = await getCurrentPatientContext(client)
  const [checkInsResult, dailyMonitorsResult] = await Promise.all([
    client
      .from('patient_check_ins')
      .select('id, clinic_id, patient_id, created_by, mood_score, anxiety_score, energy_score, problem_intensity_score, notes, checked_in_at, created_at, updated_at')
      .eq('patient_id', patientId)
      .order('checked_in_at', { ascending: false })
      .limit(30),
    client
      .from('daily_monitors')
      .select('id, clinic_id, patient_id, mood_notes, sleep_notes, activity_notes, emotion_notes, created_at, updated_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(30),
  ])
  throwIfError(checkInsResult.error)
  throwIfError(dailyMonitorsResult.error)

  return {
    checkIns: (checkInsResult.data ?? []) as PatientDetailData['checkIns'],
    dailyMonitors: (dailyMonitorsResult.data ?? []) as PatientDetailData['dailyMonitors'],
  }
}

export async function getMyPatientCheckIn(checkInId: string) {
  const client = getSupabase()
  const { patientId } = await getCurrentPatientContext(client)
  const { data, error } = await client
    .from('patient_check_ins')
    .select('id, mood_score, anxiety_score, energy_score, problem_intensity_score, notes, checked_in_at')
    .eq('id', checkInId)
    .eq('patient_id', patientId)
    .maybeSingle()
  throwIfError(error)
  return data as PatientDetailData['checkIns'][number] | null
}

export async function createMyPatientCheckIn(input: {
  mood_score?: number | null
  anxiety_score?: number | null
  energy_score?: number | null
  problem_intensity_score?: number | null
  notes?: string | null
}) {
  const client = getSupabase()
  const { patientId, clinicId } = await getCurrentPatientContext(client)
  const { error } = await client.from('patient_check_ins').insert({
    clinic_id: clinicId,
    patient_id: patientId,
    mood_score: input.mood_score ?? null,
    anxiety_score: input.anxiety_score ?? null,
    energy_score: input.energy_score ?? null,
    problem_intensity_score: input.problem_intensity_score ?? null,
    notes: clean(input.notes),
  })
  throwIfError(error)
}

export async function createMyDailyMonitor(input: {
  mood_notes?: string | null
  sleep_notes?: string | null
  activity_notes?: string | null
  emotion_notes?: string | null
}) {
  const client = getSupabase()
  const { patientId, clinicId } = await getCurrentPatientContext(client)
  const { error } = await client.from('daily_monitors').insert({
    clinic_id: clinicId,
    patient_id: patientId,
    mood_notes: clean(input.mood_notes),
    sleep_notes: clean(input.sleep_notes),
    activity_notes: clean(input.activity_notes),
    emotion_notes: clean(input.emotion_notes),
  })
  throwIfError(error)
}

export async function getPatientPortalInitialAssessment() {
  const client = getSupabase()
  const { patientId } = await getCurrentPatientContext(client)
  const { data, error } = await client
    .from('patients')
    .select('id, clinic_id, full_name, birth_date, gender, relationship_status, education_level, occupation, has_children, intake_summary, current_life_context, therapy_demands, created_at')
    .eq('id', patientId)
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('Paciente não encontrado para este usuário.')
  return data as Pick<Patient, 'id' | 'clinic_id' | 'full_name' | 'birth_date' | 'gender' | 'relationship_status' | 'education_level' | 'occupation' | 'has_children' | 'intake_summary' | 'current_life_context' | 'therapy_demands' | 'created_at'>
}

export async function updatePatientInitialAssessment(input: {
  patient_id: string
  intake_summary?: string | null
  current_life_context?: string | null
  therapy_demands?: string | null
}) {
  const { error } = await getSupabase()
    .from('patients')
    .update({
      intake_summary: clean(input.intake_summary),
      current_life_context: clean(input.current_life_context),
      therapy_demands: clean(input.therapy_demands),
    })
    .eq('id', input.patient_id)
  throwIfError(error)
}

export async function updateMyPatientInitialAssessment(input: {
  intake_summary?: string | null
  current_life_context?: string | null
  therapy_demands?: string | null
}) {
  const client = getSupabase()
  const { patientId } = await getCurrentPatientContext(client)
  const { error } = await client
    .from('patients')
    .update({
      intake_summary: clean(input.intake_summary),
      current_life_context: clean(input.current_life_context),
      therapy_demands: clean(input.therapy_demands),
    })
    .eq('id', patientId)
  throwIfError(error)
}

export async function createTherapyGoal(input: {
  clinic_id: string
  patient_id: string
  title: string
  description?: string
  target_date?: string
  progress?: number
  linked_schemas?: Array<{ code?: string; name?: string }>
}) {
  const { error } = await getSupabase().from('therapy_goals').insert({
    clinic_id: input.clinic_id,
    patient_id: input.patient_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    target_date: input.target_date || null,
    status: 'active',
    progress: Math.max(0, Math.min(100, input.progress ?? 0)),
    linked_schemas: input.linked_schemas ?? [],
  })
  throwIfError(error)
}

export async function updateTherapyGoal(input: {
  id: string
  title: string
  description?: string
  target_date?: string
  progress?: number
  linked_schemas?: Array<{ code?: string; name?: string }>
}) {
  const { error } = await getSupabase()
    .from('therapy_goals')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      target_date: input.target_date || null,
      progress: Math.max(0, Math.min(100, input.progress ?? 0)),
      linked_schemas: input.linked_schemas ?? [],
    })
    .eq('id', input.id)
  throwIfError(error)
}

export async function setTherapyGoalStatus(input: {
  id: string
  status: 'active' | 'completed' | 'archived'
}) {
  const payload: { status: 'active' | 'completed' | 'archived'; progress?: number } = { status: input.status }
  if (input.status === 'completed') payload.progress = 100

  const { error } = await getSupabase()
    .from('therapy_goals')
    .update(payload)
    .eq('id', input.id)
  throwIfError(error)
}

export async function createPatientProblem(input: {
  clinic_id: string
  patient_id: string
  title: string
  description?: string
  category?: string
  intensity?: number
  identified_at?: string
}) {
  const { error } = await getSupabase().from('patient_problems').insert({
    clinic_id: input.clinic_id,
    patient_id: input.patient_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    intensity: input.intensity == null ? null : Math.max(0, Math.min(10, input.intensity)),
    status: 'active',
    identified_at: input.identified_at || new Date().toISOString().slice(0, 10),
  })
  throwIfError(error)
}

export async function updatePatientProblem(input: {
  id: string
  title: string
  description?: string
  category?: string
  intensity?: number
  identified_at?: string
}) {
  const { error } = await getSupabase()
    .from('patient_problems')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      intensity: input.intensity == null ? null : Math.max(0, Math.min(10, input.intensity)),
      identified_at: input.identified_at || null,
    })
    .eq('id', input.id)
  throwIfError(error)
}

export async function setPatientProblemStatus(input: {
  id: string
  status: 'active' | 'resolved' | 'archived'
}) {
  const { error } = await getSupabase()
    .from('patient_problems')
    .update({
      status: input.status,
      resolved_at: input.status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', input.id)
  throwIfError(error)
}

export async function assignQuestionnaireToPatient(input: {
  patient_id: string
  questionnaire_id: string
  message?: string
}) {
  const { error } = await getSupabase().functions.invoke('assign-questionnaire', {
    body: {
      patient_id: input.patient_id,
      questionnaire_id: input.questionnaire_id,
      message: clean(input.message),
    },
  })
  await throwIfFunctionError(error, 'assign-questionnaire')
}

export async function cancelPatientQuestionnaireAssignment(input: {
  patient_id: string
  questionnaire_id: string
}) {
  const { error } = await getSupabase()
    .from('patient_questionnaire_assignments')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('patient_id', input.patient_id)
    .eq('questionnaire_id', input.questionnaire_id)
    .is('cancelled_at', null)
  throwIfError(error)
}

export async function setPatientResultsReleased(input: {
  patient_id: string
  released: boolean
}) {
  const { error } = await getSupabase().rpc('set_patient_results_released', {
    p_patient_id: input.patient_id,
    p_released: input.released,
  })
  throwIfError(error)
}

export async function createPatientTimelineEvent(input: {
  clinic_id: string
  patient_id: string
  title: string
  description?: string
  event_date?: string
  category?: string
  emotional_impact?: number | null
  is_sensitive?: boolean
}) {
  const { error } = await getSupabase().from('patient_timeline_events').insert({
    clinic_id: input.clinic_id,
    patient_id: input.patient_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    event_date: input.event_date || null,
    category: input.category || null,
    emotional_impact: input.emotional_impact ?? null,
    is_sensitive: Boolean(input.is_sensitive),
  })
  throwIfError(error)
}

export async function updatePatientTimelineEvent(input: {
  id: string
  title: string
  description?: string
  event_date?: string
  category?: string
  emotional_impact?: number | null
  is_sensitive?: boolean
}) {
  const { error } = await getSupabase()
    .from('patient_timeline_events')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      event_date: input.event_date || null,
      category: input.category || null,
      emotional_impact: input.emotional_impact ?? null,
      is_sensitive: Boolean(input.is_sensitive),
    })
    .eq('id', input.id)
  throwIfError(error)
}

export async function deletePatientTimelineEvent(id: string) {
  const { error } = await getSupabase().from('patient_timeline_events').delete().eq('id', id)
  throwIfError(error)
}

export async function setPatientResourceReleased(input: {
  patient_id: string
  resource_id: string
  released: boolean
}) {
  const client = getSupabase()
  if (input.released) {
    const { error } = await client.from('patient_resource_access').upsert({
      patient_id: input.patient_id,
      resource_id: input.resource_id,
      is_active: true,
      released_at: new Date().toISOString(),
    }, { onConflict: 'patient_id,resource_id' })
    throwIfError(error)
    return
  }
  const { error } = await client.from('patient_resource_access').update({ is_active: false }).eq('patient_id', input.patient_id).eq('resource_id', input.resource_id)
  throwIfError(error)
}

export async function getPatientGenogram(patientId: string): Promise<GenogramData> {
  const client = getSupabase()
  const [personsResult, relationshipsResult] = await Promise.all([
    client
      .from('genogram_people')
      .select('id, clinic_id, patient_id, created_by, full_name, nickname, relationship_to_patient, gender, birth_year, death_year, is_deceased, caregiver_role, notes, is_sensitive, created_at, updated_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true }),
    client
      .from('genogram_relationships')
      .select('id, clinic_id, patient_id, person_a_id, person_b_id, relationship_type, notes, created_at, updated_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true }),
  ])
  throwIfError(personsResult.error)
  throwIfError(relationshipsResult.error)
  return {
    persons: (personsResult.data ?? []) as GenogramPersonRow[],
    relationships: (relationshipsResult.data ?? []) as GenogramRelationshipRow[],
  }
}

export async function getPatientPortalGenogram(): Promise<GenogramData> {
  const { patientId } = await getCurrentPatientContext()
  return getPatientGenogram(patientId)
}

export async function getPatientPortalTimeline(): Promise<PatientTimelineEventRow[]> {
  const client = getSupabase()
  const { patientId } = await getCurrentPatientContext(client)
  const { data, error } = await client
    .from('patient_timeline_events')
    .select('id, clinic_id, patient_id, created_by, title, description, event_date, period_label, category, emotional_impact, is_sensitive, created_at, updated_at')
    .eq('patient_id', patientId)
    .order('event_date', { ascending: true, nullsFirst: false })
  throwIfError(error)
  return (data ?? []) as PatientTimelineEventRow[]
}

export async function createMyTimelineEvent(input: {
  title: string
  description?: string | null
  event_date?: string | null
  period_label?: string | null
  category?: string | null
  emotional_impact?: number | null
}) {
  const client = getSupabase()
  const { patientId, clinicId } = await getCurrentPatientContext(client)
  const { error } = await client.from('patient_timeline_events').insert({
    clinic_id: clinicId,
    patient_id: patientId,
    title: input.title.trim(),
    description: clean(input.description),
    event_date: input.event_date || null,
    period_label: clean(input.period_label),
    category: input.category || 'historia_de_vida',
    emotional_impact: input.emotional_impact ?? null,
    is_sensitive: false,
  })
  throwIfError(error)
}

export async function saveGenogramPerson(input: {
  id?: string | null
  clinic_id: string
  patient_id: string
  full_name: string
  nickname?: string | null
  relationship_to_patient?: string | null
  gender?: string | null
  birth_year?: number | null
  death_year?: number | null
  is_deceased?: boolean
  caregiver_role?: string | null
  illness_type?: string | null
  pregnancy_loss_type?: string | null
  notes?: string | null
  is_sensitive?: boolean
}) {
  const payload = {
    clinic_id: input.clinic_id,
    patient_id: input.patient_id,
    full_name: input.full_name.trim(),
    nickname: clean(input.nickname),
    relationship_to_patient: clean(input.relationship_to_patient),
    gender: clean(input.gender),
    birth_year: input.birth_year ?? null,
    death_year: input.death_year ?? null,
    is_deceased: Boolean(input.is_deceased),
    caregiver_role: clean(input.caregiver_role),
    notes: clean(input.notes),
    is_sensitive: Boolean(input.is_sensitive),
  }

  if (input.id) {
    const { error } = await getSupabase()
      .from('genogram_people')
      .update(payload)
      .eq('id', input.id)
    throwIfError(error)
    return input.id
  }

  const { data, error } = await getSupabase()
    .from('genogram_people')
    .insert(payload)
    .select('id')
    .single()
  throwIfError(error)
  return data?.id as string
}

export async function deleteGenogramPerson(id: string) {
  const { error } = await getSupabase().from('genogram_people').delete().eq('id', id)
  throwIfError(error)
}

export async function saveGenogramRelationship(input: {
  clinic_id: string
  patient_id: string
  person_a_id: string
  person_b_id: string
  relationship_type: string
  notes?: string | null
}) {
  const { data, error } = await getSupabase()
    .from('genogram_relationships')
    .insert({
      clinic_id: input.clinic_id,
      patient_id: input.patient_id,
      person_a_id: input.person_a_id,
      person_b_id: input.person_b_id,
      relationship_type: input.relationship_type,
      notes: clean(input.notes),
    })
    .select('id')
    .single()
  throwIfError(error)
  return data?.id as string
}

export async function deleteGenogramRelationship(id: string) {
  const { error } = await getSupabase().from('genogram_relationships').delete().eq('id', id)
  throwIfError(error)
}

export async function getCaseConceptualization(patientId: string): Promise<CaseConceptualizationRow | null> {
  const { data, error } = await getSupabase()
    .from('case_conceptualizations')
    .select('id, patient_id, clinic_id, unmet_needs, mode_sequences, therapeutic_relationship, general_impressions, diagnosis, origins, motivo_notes, additional_comments, updated_at')
    .eq('patient_id', patientId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  throwIfError(error)
  return (data ?? null) as CaseConceptualizationRow | null
}

// ── Avaliação inicial ─────────────────────────────────────────────────────────

export async function getPatientIntake(patientId: string): Promise<PatientIntakeRow | null> {
  const { data, error } = await getSupabase()
    .from('patient_intake')
    .select('patient_id, reason_for_seeking, problem_duration, main_discomfort, expectations, related_event, completed_at, filled_by_role')
    .eq('patient_id', patientId)
    .maybeSingle()
  throwIfError(error)
  return (data ?? null) as PatientIntakeRow | null
}

export async function getPatientClinicalIntake(patientId: string): Promise<PatientClinicalIntakeRow | null> {
  const { data, error } = await getSupabase()
    .from('patient_clinical_intake')
    .select('patient_id, initial_observations, main_complaint, current_problem, precipitating_factors, patient_goals, motivation, initial_hypotheses')
    .eq('patient_id', patientId)
    .maybeSingle()
  throwIfError(error)
  return (data ?? null) as PatientClinicalIntakeRow | null
}

export async function listPatientLifeAreas(patientId: string): Promise<PatientLifeAreaRow[]> {
  const { data, error } = await getSupabase()
    .from('patient_life_areas')
    .select('patient_id, area_key, score, suffering, guided_answer, filled_by_role, assessed_at')
    .eq('patient_id', patientId)
  throwIfError(error)
  return (data ?? []) as PatientLifeAreaRow[]
}

export async function getPatientClinicalImpressions(patientId: string): Promise<PatientClinicalImpressionsRow | null> {
  const { data, error } = await getSupabase()
    .from('patient_clinical_impressions')
    .select('patient_id, observed_temperament, therapeutic_bond, resources, vulnerabilities, hypotheses, previous_diagnoses, differential_diagnosis, functioning_level, therapeutic_priorities, schema_hypotheses_text, mode_hypotheses_text, emotional_needs_text')
    .eq('patient_id', patientId)
    .maybeSingle()
  throwIfError(error)
  return (data ?? null) as PatientClinicalImpressionsRow | null
}

export async function listClinicalHypotheses(patientId: string): Promise<ClinicalHypothesisRow[]> {
  const { data, error } = await getSupabase()
    .from('clinical_hypotheses')
    .select('id, kind, body')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true })
  throwIfError(error)
  return (data ?? []) as ClinicalHypothesisRow[]
}

export async function getPatientFamilyContext(patientId: string): Promise<PatientFamilyContextRow | null> {
  const { data, error } = await getSupabase()
    .from('patient_family_context')
    .select('patient_id, family_climate, family_climate_other, transgenerational_patterns, transgenerational_patterns_other, filled_by_role')
    .eq('patient_id', patientId)
    .maybeSingle()
  throwIfError(error)
  return (data ?? null) as PatientFamilyContextRow | null
}

export async function getGenogramFamilyPatterns(patientId: string): Promise<GenogramFamilyPatternsRow | null> {
  const { data, error } = await getSupabase()
    .from('genogram_family_patterns')
    .select('patient_id, pattern_keys, other_text')
    .eq('patient_id', patientId)
    .maybeSingle()
  throwIfError(error)
  return (data ?? null) as GenogramFamilyPatternsRow | null
}

export async function listTimelineEventNotes(patientId: string): Promise<TimelineEventNoteRow[]> {
  const { data, error } = await getSupabase()
    .from('patient_timeline_event_notes')
    .select('event_id, clinical_comment')
    .eq('patient_id', patientId)
  throwIfError(error)
  return (data ?? []) as TimelineEventNoteRow[]
}

export async function listTimelineEventPeople(eventIds: string[]): Promise<TimelineEventPersonRow[]> {
  if (!eventIds.length) return []
  const { data, error } = await getSupabase()
    .from('timeline_event_people')
    .select('event_id, person_id')
    .in('event_id', eventIds)
  throwIfError(error)
  return (data ?? []) as TimelineEventPersonRow[]
}

export async function listGenogramPersonNotes(patientId: string): Promise<GenogramPersonNoteRow[]> {
  const { data, error } = await getSupabase()
    .from('genogram_person_notes')
    .select('person_id, clinical_comment')
    .eq('patient_id', patientId)
  throwIfError(error)
  return (data ?? []) as GenogramPersonNoteRow[]
}

export async function listPatientLifeAreaNotes(patientId: string): Promise<PatientLifeAreaNoteRow[]> {
  const { data, error } = await getSupabase()
    .from('patient_life_area_notes')
    .select('patient_id, area_key, clinical_comment')
    .eq('patient_id', patientId)
  throwIfError(error)
  return (data ?? []) as PatientLifeAreaNoteRow[]
}

export async function listSchemaActivations(patientId: string): Promise<SchemaActivationRow[]> {
  const { data, error } = await getSupabase()
    .from('questionnaire_schema_activations')
    .select('id, questionnaire_response_id, schema_code, schema_name, psi_observation, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  throwIfError(error)
  return (data ?? []) as SchemaActivationRow[]
}

export async function listPersonalityAssessments(patientId: string): Promise<PersonalityAssessmentRow[]> {
  const { data, error } = await getSupabase()
    .from('personality_assessments')
    .select('id, patient_id, instrument, results, applied_on, application_form, protocol_validity, shared_with_patient, clinical_synthesis, conceptualization_integration, created_at, updated_at')
    .eq('patient_id', patientId)
    .order('applied_on', { ascending: false, nullsFirst: false })
  throwIfError(error)
  return (data ?? []) as PersonalityAssessmentRow[]
}

export async function savePersonalityAssessment(input: {
  id?: string | null
  patient_id: string
  instrument: string
  results?: PersonalityResults | null
  applied_on?: string | null
  application_form?: string | null
  protocol_validity?: string | null
  shared_with_patient?: boolean | null
  clinical_synthesis?: PersonalityClinicalSynthesis | null
  conceptualization_integration?: PersonalityConceptualizationIntegration | null
}) {
  const payload = {
    patient_id: input.patient_id,
    instrument: input.instrument.trim() || 'NEO-PI-R',
    results: input.results ?? {},
    applied_on: cleanDate(input.applied_on),
    application_form: clean(input.application_form),
    protocol_validity: clean(input.protocol_validity),
    shared_with_patient: Boolean(input.shared_with_patient),
    clinical_synthesis: input.clinical_synthesis ?? {},
    conceptualization_integration: input.conceptualization_integration ?? {},
  }

  if (input.id) {
    const { error } = await getSupabase()
      .from('personality_assessments')
      .update(payload)
      .eq('id', input.id)
    throwIfError(error)
    return input.id
  }

  const { data, error } = await getSupabase()
    .from('personality_assessments')
    .insert(payload)
    .select('id')
    .single()
  throwIfError(error)
  return data?.id as string
}

export async function setPersonalityAssessmentShared(input: { id: string; shared_with_patient: boolean }) {
  const { error } = await getSupabase()
    .from('personality_assessments')
    .update({ shared_with_patient: input.shared_with_patient })
    .eq('id', input.id)
  throwIfError(error)
}

export async function deletePersonalityAssessment(id: string) {
  const { error } = await getSupabase().from('personality_assessments').delete().eq('id', id)
  throwIfError(error)
}

function filenameFromContentDisposition(value?: string | null) {
  if (!value) return null
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replaceAll('"', ''))
  const plainMatch = value.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] ?? null
}

function slugifyFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export async function generateClinicalReportPdf(input: {
  patient_id: string
  patient_name?: string | null
  include: ClinicalReportIncludeOptions
}): Promise<ClinicalReportPdfResult> {
  const { data, error, response } = await getSupabase().functions.invoke('generate-clinical-report', {
    body: {
      patient_id: input.patient_id,
      include: input.include,
    },
  })
  await throwIfFunctionError(error, 'generate-clinical-report')

  let blob: Blob
  if (data instanceof Blob) {
    blob = data.type === 'application/pdf' ? data : new Blob([data], { type: 'application/pdf' })
  } else if (data instanceof ArrayBuffer) {
    blob = new Blob([data], { type: 'application/pdf' })
  } else if (Array.isArray(data)) {
    blob = new Blob([new Uint8Array(data)], { type: 'application/pdf' })
  } else {
    throw new Error('A Edge Function retornou um formato inesperado para o PDF clínico.')
  }

  const filename = filenameFromContentDisposition(response?.headers.get('content-disposition'))
    ?? `relatorio-clinico-${slugifyFilename(input.patient_name ?? 'paciente') || 'paciente'}.pdf`

  return { blob, filename }
}

export async function listPatientPortalPersonalityAssessments(): Promise<PersonalityAssessmentRow[]> {
  const client = getSupabase()
  const { patientId } = await getCurrentPatientContext(client)
  const { data, error } = await client
    .from('personality_assessments')
    .select('id, patient_id, instrument, results, applied_on, application_form, protocol_validity, shared_with_patient, created_at')
    .eq('patient_id', patientId)
    .eq('shared_with_patient', true)
    .order('applied_on', { ascending: false, nullsFirst: false })
  throwIfError(error)
  return (data ?? []).map((assessment) => ({
    ...(assessment as PersonalityAssessmentRow),
    conceptualization_integration: null,
    clinical_synthesis: null,
  }))
}

export async function listTherapyResources(): Promise<TherapyResourceRow[]> {
  const profile = await getCurrentProfile()
  if (!profile?.clinic_id) throw new Error('Selecione uma clínica para gerenciar recursos terapêuticos.')

  const { data, error } = await getSupabase()
    .from('therapy_resources')
    .select('id, clinic_id, title, type, description, url, is_active, created_at')
    .eq('clinic_id', profile.clinic_id)
    .order('created_at', { ascending: false })
  throwIfError(error)
  return (data ?? []).map((resource) => ({ ...resource, is_released: false })) as TherapyResourceRow[]
}

export async function saveTherapyResource(input: {
  id?: string | null
  title: string
  type: string
  description?: string | null
  url?: string | null
  is_active?: boolean
}) {
  const profile = await getCurrentProfile()
  if (!profile?.clinic_id) throw new Error('Selecione uma clínica para gerenciar recursos terapêuticos.')

  const payload = {
    clinic_id: profile.clinic_id,
    title: input.title.trim(),
    type: input.type.trim() || 'material',
    description: clean(input.description),
    url: clean(input.url),
    is_active: input.is_active ?? true,
  }

  if (input.id) {
    const { error } = await getSupabase()
      .from('therapy_resources')
      .update(payload)
      .eq('id', input.id)
    throwIfError(error)
    return input.id
  }

  const { data, error } = await getSupabase()
    .from('therapy_resources')
    .insert(payload)
    .select('id')
    .single()
  throwIfError(error)
  return data?.id as string
}

export async function setTherapyResourceActive(input: { id: string; is_active: boolean }) {
  const { error } = await getSupabase()
    .from('therapy_resources')
    .update({ is_active: input.is_active })
    .eq('id', input.id)
  throwIfError(error)
}

export async function listPatientPortalResources(): Promise<TherapyResourceRow[]> {
  const client = getSupabase()
  const { patientId, clinicId } = await getCurrentPatientContext(client)
  const accessResult = await client
    .from('patient_resource_access')
    .select('resource_id, is_active')
    .eq('patient_id', patientId)
    .eq('is_active', true)
  throwIfError(accessResult.error)

  const resourceIds = Array.from(new Set((accessResult.data ?? []).map((row) => row.resource_id as string).filter(Boolean)))
  if (!resourceIds.length) return []

  const { data, error } = await client
    .from('therapy_resources')
    .select('id, clinic_id, title, type, description, url, is_active, created_at')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .in('id', resourceIds)
    .order('title')
  throwIfError(error)
  return (data ?? []).map((resource) => ({ ...resource, is_released: true })) as TherapyResourceRow[]
}

export async function listLibraryWorks(): Promise<LibraryWorkRow[]> {
  const { data, error } = await getSupabase()
    .from('library_works')
    .select('id, display_title, work_type, is_animation, year, genres, duration, seasons, rating, synopsis, cover_url, intensity, patient_layer, therapist_layer')
    .order('display_title')
  throwIfError(error)
  return (data ?? []) as LibraryWorkRow[]
}

export async function saveLibraryWork(input: {
  id?: string | null
  display_title: string
  work_type: string
  is_animation?: boolean
  year?: number | null
  genres?: string[]
  duration?: string | null
  seasons?: number | null
  rating?: string | null
  synopsis?: string | null
  cover_url?: string | null
  intensity?: number | null
  patient_layer?: LibraryWorkLayer | null
  therapist_layer?: LibraryWorkLayer | null
}) {
  const payload = {
    display_title: input.display_title.trim(),
    work_type: input.work_type.trim() || 'filme',
    is_animation: Boolean(input.is_animation),
    year: input.year ?? null,
    genres: input.genres ?? [],
    duration: clean(input.duration),
    seasons: input.seasons ?? null,
    rating: clean(input.rating),
    synopsis: clean(input.synopsis),
    cover_url: clean(input.cover_url),
    intensity: input.intensity == null ? null : Math.max(0, Math.min(10, input.intensity)),
    patient_layer: input.patient_layer ?? {},
    therapist_layer: input.therapist_layer ?? {},
  }

  if (input.id) {
    const { error } = await getSupabase()
      .from('library_works')
      .update(payload)
      .eq('id', input.id)
    throwIfError(error)
    return input.id
  }

  const { data, error } = await getSupabase()
    .from('library_works')
    .insert(payload)
    .select('id')
    .single()
  throwIfError(error)
  return data?.id as string
}

export async function deleteLibraryWork(id: string) {
  const { error } = await getSupabase().from('library_works').delete().eq('id', id)
  throwIfError(error)
}

export async function listPatientLibraryIndications(patientId: string): Promise<LibraryIndicationRow[]> {
  const client = getSupabase()
  const indicationsResult = await client
    .from('library_indications')
    .select('id, work_id, patient_id, indicated_by, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  throwIfError(indicationsResult.error)

  const indications = (indicationsResult.data ?? []) as LibraryIndicationRow[]
  const workIds = Array.from(new Set(indications.map((indication) => indication.work_id).filter(Boolean)))
  const worksResult = workIds.length
    ? await client
        .from('library_works')
        .select('id, display_title, work_type, is_animation, year, genres, duration, seasons, rating, synopsis, cover_url, intensity, patient_layer, therapist_layer')
        .in('id', workIds)
    : { data: [], error: null }
  throwIfError(worksResult.error)

  const worksById = new Map((worksResult.data ?? []).map((work) => [work.id as string, work as LibraryWorkRow]))
  return indications.map((indication) => ({ ...indication, work: worksById.get(indication.work_id) ?? null }))
}

export async function indicateLibraryWorkToPatient(input: { patient_id: string; work_id: string }) {
  const profile = await getCurrentProfile()
  const { error } = await getSupabase().from('library_indications').insert({
    patient_id: input.patient_id,
    work_id: input.work_id,
    indicated_by: profile?.id ?? null,
  })
  throwIfError(error)
}

export async function removeLibraryIndication(id: string) {
  const { error } = await getSupabase().from('library_indications').delete().eq('id', id)
  throwIfError(error)
}

export async function listPatientPortalLibrary(): Promise<LibraryIndicationRow[]> {
  const client = getSupabase()
  const { patientId } = await getCurrentPatientContext(client)
  const indicationsResult = await client
    .from('library_indications')
    .select('id, work_id, patient_id, indicated_by, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  throwIfError(indicationsResult.error)

  const indications = (indicationsResult.data ?? []) as LibraryIndicationRow[]
  const workIds = Array.from(new Set(indications.map((indication) => indication.work_id).filter(Boolean)))
  if (!workIds.length) return []

  const worksResult = await client
    .from('library_works')
    .select('id, display_title, work_type, is_animation, year, genres, duration, seasons, rating, synopsis, cover_url, intensity, patient_layer')
    .in('id', workIds)
  throwIfError(worksResult.error)

  const worksById = new Map((worksResult.data ?? []).map((work) => [work.id as string, { ...work, therapist_layer: null } as LibraryWorkRow]))
  return indications.map((indication) => ({ ...indication, work: worksById.get(indication.work_id) ?? null }))
}

export async function getPatientPortalLibraryWork(indicationId: string): Promise<LibraryIndicationRow> {
  const client = getSupabase()
  const { patientId } = await getCurrentPatientContext(client)
  const indicationResult = await client
    .from('library_indications')
    .select('id, work_id, patient_id, indicated_by, created_at')
    .eq('id', indicationId)
    .eq('patient_id', patientId)
    .maybeSingle()
  throwIfError(indicationResult.error)
  if (!indicationResult.data) throw new Error('Indicação não encontrada para este paciente.')

  const workResult = await client
    .from('library_works')
    .select('id, display_title, work_type, is_animation, year, genres, duration, seasons, rating, synopsis, cover_url, intensity, patient_layer')
    .eq('id', indicationResult.data.work_id as string)
    .maybeSingle()
  throwIfError(workResult.error)
  if (!workResult.data) throw new Error('Obra indicada não encontrada.')

  return {
    ...(indicationResult.data as LibraryIndicationRow),
    work: { ...workResult.data, therapist_layer: null } as LibraryWorkRow,
  }
}

function sanitizePatientPsychoeducation(module: PsychoeducationModuleRow): PsychoeducationModuleRow {
  return {
    ...module,
    cards: (module.cards ?? []).map((card) => ({
      title: card.title ?? null,
      imageUrl: card.imageUrl ?? null,
      patientText: card.patientText ?? null,
      reflection: card.reflection ?? null,
      exercise: card.exercise ?? null,
      therapistText: null,
    })),
  }
}

export async function listPsychoeducationModules(): Promise<PsychoeducationModuleRow[]> {
  const { data, error } = await getSupabase()
    .from('psychoeducation_modules')
    .select('id, number, stage, title, presentation, closing, accent_color, cover_url, cards')
    .order('number')
  throwIfError(error)
  return (data ?? []) as PsychoeducationModuleRow[]
}

export async function savePsychoeducationModule(input: {
  id?: string | null
  number: number
  stage: string
  title: string
  presentation?: string | null
  closing?: string | null
  accent_color?: string | null
  cover_url?: string | null
  cards?: PsychoeducationCard[] | null
}) {
  const payload = {
    number: input.number,
    stage: input.stage.trim(),
    title: input.title.trim(),
    presentation: clean(input.presentation),
    closing: clean(input.closing),
    accent_color: clean(input.accent_color),
    cover_url: clean(input.cover_url),
    cards: input.cards ?? [],
  }

  if (input.id) {
    const { error } = await getSupabase()
      .from('psychoeducation_modules')
      .update(payload)
      .eq('id', input.id)
    throwIfError(error)
    return input.id
  }

  const { data, error } = await getSupabase()
    .from('psychoeducation_modules')
    .insert(payload)
    .select('id')
    .single()
  throwIfError(error)
  return data?.id as string
}

export async function deletePsychoeducationModule(id: string) {
  const { error } = await getSupabase().from('psychoeducation_modules').delete().eq('id', id)
  throwIfError(error)
}

export async function listPatientPsychoeducationModules(): Promise<PsychoeducationModuleRow[]> {
  const modules = await listPsychoeducationModules()
  return modules.map(sanitizePatientPsychoeducation)
}

export async function getPatientPsychoeducationModule(moduleId: string): Promise<PsychoeducationModuleRow> {
  const { data, error } = await getSupabase()
    .from('psychoeducation_modules')
    .select('id, number, stage, title, presentation, closing, accent_color, cover_url, cards')
    .eq('id', moduleId)
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('Módulo de psicoeducação não encontrado.')
  return sanitizePatientPsychoeducation(data as PsychoeducationModuleRow)
}

export async function getPsychoeducationModule(moduleId: string): Promise<PsychoeducationModuleRow> {
  const { data, error } = await getSupabase()
    .from('psychoeducation_modules')
    .select('id, number, stage, title, presentation, closing, accent_color, cover_url, cards')
    .eq('id', moduleId)
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('Módulo de psicoeducação não encontrado.')
  return data as PsychoeducationModuleRow
}
const defaultFeatureCatalog = [
  { key: 'patients', name: 'Pacientes' },
  { key: 'questionnaires', name: 'Questionários' },
  { key: 'reports', name: 'Relatórios' },
  { key: 'audit', name: 'Auditoria' },
  { key: 'resources', name: 'Recursos terapêuticos' },
  { key: 'library', name: 'Biblioteca cinematográfica' },
  { key: 'psychoeducation', name: 'Psicoeducação' },
  { key: 'genogram', name: 'Genograma' },
  { key: 'personality', name: 'Personalidade' },
  { key: 'clinical_pdf', name: 'Relatório clínico PDF' },
  { key: 'clinical_alerts', name: 'Alertas clínicos' },
  { key: 'advanced_governance', name: 'Governança avançada' },
]

export async function getCurrentClinicEntitlements(): Promise<ClinicFeatureEntitlement[]> {
  const client = getSupabase()
  const rpcResult = await client.rpc('get_current_clinic_entitlements')

  if (!rpcResult.error && Array.isArray(rpcResult.data)) {
    return rpcResult.data as ClinicFeatureEntitlement[]
  }

  if (!rpcResult.error && rpcResult.data && typeof rpcResult.data === 'object') {
    return Object.entries(rpcResult.data as Record<string, unknown>).map(([featureKey, value]) => {
      const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
      return {
        feature_key: typeof record.feature_key === 'string' ? record.feature_key : featureKey,
        feature_name: typeof record.feature_name === 'string' ? record.feature_name : featureKey,
        is_enabled: typeof record.is_enabled === 'boolean'
          ? record.is_enabled
          : typeof record.enabled === 'boolean'
            ? record.enabled
            : Boolean(value),
        limit_value: typeof record.limit_value === 'number' ? record.limit_value : null,
        notes: typeof record.notes === 'string' ? record.notes : null,
      } as ClinicFeatureEntitlement
    })
  }

  const profile = await getCurrentProfile()
  if (!profile?.clinic_id) return []

  const { data, error } = await client
    .from('clinic_feature_entitlements')
    .select('id, clinic_id, feature_key, feature_name, is_enabled, limit_value, notes, updated_by, created_at, updated_at')
    .eq('clinic_id', profile.clinic_id)

  if (error) return []
  return (data ?? []) as ClinicFeatureEntitlement[]
}

export async function getPlansData(): Promise<PlansData> {
  const client = getSupabase()
  const [plansResult, clinicsResult, assignmentsResult, featuresResult, usersResult, patientsResult] = await Promise.all([
    client.from('platform_plans').select('id, code, name, description, monthly_price_cents, is_active, default_limits, default_features, created_at, updated_at').order('monthly_price_cents'),
    client.from('clinics').select('id, name, document, email, phone, clinic_type, is_active, created_at, updated_at').order('name'),
    client.from('clinic_plan_assignments').select('id, clinic_id, plan_id, commercial_status, starts_at, ends_at, notes, updated_by, created_at, updated_at'),
    client.from('clinic_feature_entitlements').select('id, clinic_id, feature_key, feature_name, is_enabled, limit_value, notes, updated_by, created_at, updated_at'),
    client.from('profiles').select('clinic_id, role').in('role', ['platform_admin', 'psychologist']),
    client.from('patients').select('clinic_id, is_active'),
  ])

  ;[plansResult, clinicsResult, assignmentsResult, featuresResult, usersResult, patientsResult].forEach((result) => throwIfError(result.error))

  const plans = (plansResult.data ?? []) as PlansData['plans']
  const clinics = (clinicsResult.data ?? []) as Clinic[]
  const assignments = (assignmentsResult.data ?? []) as PlansData['rows'][number]['assignment'][]
  const features = (featuresResult.data ?? []) as PlansData['rows'][number]['features']
  const planById = new Map(plans.map((plan) => [plan.id, plan]))
  const assignmentByClinic = new Map(assignments.filter(Boolean).map((assignment) => [assignment!.clinic_id, assignment]))
  const featuresByClinic = new Map<string, PlansData['rows'][number]['features']>()
  const usersByClinic = new Map<string, number>()
  const psychologistsByClinic = new Map<string, number>()
  const activePatientsByClinic = new Map<string, number>()

  for (const feature of features) {
    const current = featuresByClinic.get(feature.clinic_id) ?? []
    current.push(feature)
    featuresByClinic.set(feature.clinic_id, current)
  }

  for (const user of usersResult.data ?? []) {
    const clinicId = user.clinic_id as string | null
    if (!clinicId) continue
    usersByClinic.set(clinicId, (usersByClinic.get(clinicId) ?? 0) + 1)
    if (user.role === 'psychologist') psychologistsByClinic.set(clinicId, (psychologistsByClinic.get(clinicId) ?? 0) + 1)
  }

  for (const patient of patientsResult.data ?? []) {
    const clinicId = patient.clinic_id as string | null
    if (clinicId && patient.is_active) activePatientsByClinic.set(clinicId, (activePatientsByClinic.get(clinicId) ?? 0) + 1)
  }

  return {
    plans,
    rows: clinics.map((clinic) => {
      const assignment = assignmentByClinic.get(clinic.id) ?? null
      return {
        clinic,
        assignment,
        plan: assignment?.plan_id ? planById.get(assignment.plan_id) ?? null : null,
        features: (featuresByClinic.get(clinic.id) ?? []).sort((a, b) => a.feature_name.localeCompare(b.feature_name)),
        users: usersByClinic.get(clinic.id) ?? 0,
        psychologists: psychologistsByClinic.get(clinic.id) ?? 0,
        activePatients: activePatientsByClinic.get(clinic.id) ?? 0,
      }
    }),
    featureCatalog: defaultFeatureCatalog,
  }
}

export async function saveClinicPlanAssignment(input: {
  clinic_id: string
  plan_id: string | null
  commercial_status: string
  starts_at: string
  ends_at?: string | null
  notes?: string | null
  updated_by: string
}) {
  const { error } = await getSupabase()
    .from('clinic_plan_assignments')
    .upsert({
      clinic_id: input.clinic_id,
      plan_id: input.plan_id,
      commercial_status: input.commercial_status,
      starts_at: input.starts_at,
      ends_at: cleanDate(input.ends_at),
      notes: clean(input.notes),
      updated_by: input.updated_by,
    }, { onConflict: 'clinic_id' })
  throwIfError(error)
}

export async function saveClinicFeatureEntitlement(input: {
  clinic_id: string
  feature_key: string
  feature_name: string
  is_enabled: boolean
  limit_value?: number | null
  notes?: string | null
  updated_by: string
}) {
  const { error } = await getSupabase()
    .from('clinic_feature_entitlements')
    .upsert({
      clinic_id: input.clinic_id,
      feature_key: input.feature_key,
      feature_name: input.feature_name,
      is_enabled: input.is_enabled,
      limit_value: input.limit_value ?? null,
      notes: clean(input.notes),
      updated_by: input.updated_by,
    }, { onConflict: 'clinic_id,feature_key' })
  throwIfError(error)
}

