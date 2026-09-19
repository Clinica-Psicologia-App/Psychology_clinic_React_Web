export type ProfileRole = 'platform_admin' | 'admin' | 'psychologist' | 'patient'

export type AdminProfile = {
  id: string
  clinic_id: string | null
  full_name: string
  email: string
  role: ProfileRole
  is_active: boolean
  avatar_type?: 'initials' | 'photo' | 'custom' | string | null
  avatar_url?: string | null
  avatar_config?: Record<string, unknown> | null
  clinic?: {
    id: string
    name: string
    is_active: boolean
  } | null
}

export type Clinic = {
  id: string
  name: string
  document: string | null
  email?: string | null
  phone?: string | null
  clinic_type?: string | null
  is_active: boolean
  created_at: string
  updated_at?: string | null
  user_count?: number
  patient_count?: number
}

export type UserProfile = {
  id: string
  clinic_id: string | null
  full_name: string
  email: string
  phone?: string | null
  role: ProfileRole
  is_active: boolean
  avatar_type?: 'initials' | 'photo' | 'custom' | string | null
  avatar_url?: string | null
  avatar_config?: Record<string, unknown> | null
  can_receive_patients?: boolean | null
  patient_assignment_limit?: number | null
  crp?: string | null
  created_at: string
  clinic?: {
    id: string
    name: string
    clinic_type?: string | null
    is_active: boolean
  } | null
  assigned_patients_count?: number
  pending_patient_invitations_count?: number
}

export type Patient = {
  id: string
  clinic_id: string
  profile_id?: string | null
  responsible_psychologist_id: string | null
  full_name: string
  email: string | null
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
  intake_summary?: string | null
  current_life_context?: string | null
  therapy_demands?: string | null
  is_active: boolean
  inactivated_at?: string | null
  results_released_at?: string | null
  results_released_by?: string | null
  created_at: string
  responsible_psychologist?: { full_name: string } | null
  access_profile?: { is_active: boolean } | null
}

export type PatientInvitation = {
  id: string
  clinic_id: string
  invited_by: string
  responsible_psychologist_id: string
  email: string
  full_name?: string | null
  phone?: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string
  accepted_at?: string | null
  patient_profile_id?: string | null
  patient_id?: string | null
  created_at: string
  invited_by_profile?: { full_name: string | null } | null
  responsible_psychologist_profile?: { full_name: string | null } | null
}

export type CreatedPatientInvitation = {
  invitation: PatientInvitation
  invite_url: string
  expires_at: string
}

export type QuestionnaireCatalogItem = {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  author_name?: string | null
  instrument_version: string | null
  citation?: string | null
  license_notes?: string | null
  clinical_status: string | null
  version_id?: string | null
  version?: string | null
  version_status?: string | null
  reference_period?: string | null
  scale_min?: number | null
  scale_max?: number | null
  question_count?: number | null
  questions_count?: number | null
  response_count?: number | null
  responses_count?: number | null
  updated_at?: string | null
}

export type QuestionnaireQuestion = {
  id: string
  code: string
  text: string
  order_index: number
  answer_type: string
  scale_min: number
  scale_max: number
  weight: number
  reverse_score: boolean
}

export type QuestionnaireDetail = {
  questionnaire: Record<string, unknown>
  version: Record<string, unknown>
  questions: QuestionnaireQuestion[]
}

export type QuestionnaireAccessRow = {
  id?: string
  clinic_id: string
  questionnaire_id: string
  professional_id: string
  granted_by?: string | null
  is_enabled: boolean
  granted_at?: string | null
  revoked_at?: string | null
  updated_at?: string | null
}

export type DashboardData = {
  clinics: number
  activeClinics: number
  users: number
  psychologists: number
  patients: number
  activePatients: number
  questionnaires: number
  responses: number
}
export type ReportClinicRow = {
  id: string
  name: string
  type: string
  is_active: boolean
  users: number
  psychologists: number
  patients: number
  activePatients: number
  responses: number
  completedResponses: number
  pendingInvitations: number
}

export type ReportPsychologistRow = {
  id: string
  name: string
  email: string
  clinicName: string
  is_active: boolean
  can_receive_patients: boolean
  patient_assignment_limit: number | null
  patients: number
  activePatients: number
  pendingInvitations: number
  responses: number
  completedResponses: number
}

export type ReportQuestionnaireRow = {
  id: string
  code: string
  name: string
  clinical_status: string
  is_active: boolean
  responses: number
  completedResponses: number
  draftResponses: number
  cancelledResponses: number
  completionRate: number
}

export type ReportMonthlyPoint = {
  label: string
  responses: number
  completed: number
}

export type ReportsData = {
  generatedAt: string
  totals: DashboardData & {
    completedResponses: number
    draftResponses: number
    cancelledResponses: number
    pendingInvitations: number
    responseCompletionRate: number
  }
  clinicRows: ReportClinicRow[]
  psychologistRows: ReportPsychologistRow[]
  questionnaireRows: ReportQuestionnaireRow[]
  monthlyResponses: ReportMonthlyPoint[]
  responseStatusRows: Array<{ status: string; count: number }>
}
export type PatientOverviewRow = {
  id: string
  clinic_id: string
  clinic_name: string
  psychologist_id: string | null
  psychologist_name: string
  totalPatients: number
  activePatients: number
  inactivePatients: number
  withAppAccess: number
  responses: number
  completedResponses: number
  lastPatientCreatedAt: string | null
}

export type PatientOverviewData = {
  generatedAt: string
  totals: {
    clinics: number
    psychologists: number
    patients: number
    activePatients: number
    inactivePatients: number
    withAppAccess: number
    responses: number
    completedResponses: number
  }
  rows: PatientOverviewRow[]
}

export type PatientPortalResultsData = {
  patient: Pick<Patient, 'id' | 'full_name' | 'results_released_at' | 'created_at'>
  responses: PatientQuestionnaireResponseRow[]
  responseResults: PatientQuestionnaireResultRow[]
}
export type AuditEventRow = {
  id: string
  action: string
  entity_type: string
  entity_id?: string | null
  occurred_at: string
  clinic_id?: string | null
  actor_profile_id?: string | null
  actor_name: string
  actor_email?: string | null
  clinic_name?: string | null
  metadata?: Record<string, unknown> | null
}

export type SettingsData = {
  generatedAt: string
  totals: {
    clinics: number
    activeClinics: number
    platformAdmins: number
    psychologists: number
    patients: number
    activePatients: number
    questionnaires: number
    approvedQuestionnaires: number
    suspendedQuestionnaires: number
    legalConsents: number
    auditEvents: number
  }
  questionnaireGovernance: Array<{ status: string; count: number }>
  recentAuditEvents: AuditEventRow[]
}
export type AuditData = {
  generatedAt: string
  events: AuditEventRow[]
  clinics: Array<{ id: string; name: string }>
  actors: Array<{ id: string; name: string; email: string | null }>
  actions: string[]
  entityTypes: string[]
}
export type ClinicDetailData = {
  clinic: Clinic
  totals: {
    users: number
    psychologists: number
    patients: number
    activePatients: number
    responses: number
    completedResponses: number
    pendingInvitations: number
    questionnaireAccess: number
  }
  users: UserProfile[]
  patients: Patient[]
  questionnaireRows: ReportQuestionnaireRow[]
  monthlyResponses: ReportMonthlyPoint[]
  auditEvents: AuditEventRow[]
}
export type PsychologistDetailData = {
  psychologist: UserProfile
  clinic: Clinic | null
  totals: {
    patients: number
    activePatients: number
    pendingInvitations: number
    responses: number
    completedResponses: number
    questionnaireAccess: number
    capacityUsed: number
  }
  patients: Patient[]
  questionnaireRows: ReportQuestionnaireRow[]
  monthlyResponses: ReportMonthlyPoint[]
  auditEvents: AuditEventRow[]
}
export type PatientQuestionnaireResponseRow = {
  id: string
  questionnaire_id: string
  questionnaire_name: string
  questionnaire_code: string
  status: string
  created_at: string
  completed_at?: string | null
}

export type PatientQuestionnaireResultRow = {
  id: string
  response_id: string
  category_id?: string | null
  category_code?: string | null
  category_name?: string | null
  total_score?: number | null
  average_score?: number | null
  classification?: string | null
  professional_average_score?: number | null
  professional_note?: string | null
}

export type PatientQuestionnaireAnswerRow = {
  id: string
  response_id: string
  question_id: string
  question_code: string
  question_text: string
  order_index: number
  answer_type: string
  scale_min?: number | null
  scale_max?: number | null
  answer_value?: number | null
  professional_value?: number | null
  professional_note?: string | null
  context_label?: string | null
}

export type TherapyGoalRow = {
  id: string
  clinic_id?: string
  patient_id?: string
  created_by?: string | null
  title: string
  description?: string | null
  status: 'active' | 'completed' | 'archived'
  target_date?: string | null
  completed_at?: string | null
  progress?: number | null
  linked_schemas?: Array<{ code?: string; name?: string }> | null
  created_at: string
  updated_at?: string | null
}

export type PatientProblemRow = {
  id: string
  clinic_id?: string
  patient_id?: string
  created_by?: string | null
  title: string
  description?: string | null
  category?: string | null
  intensity?: number | null
  status: 'active' | 'resolved' | 'archived'
  identified_at?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at?: string | null
}

export type PatientCheckInRow = {
  id: string
  clinic_id?: string
  patient_id?: string
  created_by?: string | null
  mood_score?: number | null
  anxiety_score?: number | null
  energy_score?: number | null
  problem_intensity_score?: number | null
  notes?: string | null
  checked_in_at: string
  created_at?: string | null
  updated_at?: string | null
}

export type DailyMonitorRow = {
  id: string
  clinic_id?: string
  patient_id?: string
  mood_notes?: string | null
  sleep_notes?: string | null
  activity_notes?: string | null
  emotion_notes?: string | null
  created_at: string
  updated_at?: string | null
}

export type PatientTimelineEventRow = {
  id: string
  clinic_id?: string
  patient_id?: string
  created_by?: string | null
  title: string
  description?: string | null
  event_date?: string | null
  period_label?: string | null
  category?: string | null
  emotional_impact?: number | null
  is_sensitive: boolean
  created_at: string
  updated_at?: string | null
}

export type TherapyResourceRow = {
  id: string
  clinic_id?: string
  title: string
  type: string
  description?: string | null
  url?: string | null
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
  is_released: boolean
}

export type LibraryWorkLayer = {
  instructions_before?: string | null
  instructions_during?: string | null
  instructions_after?: string | null
  reflection_questions?: string[] | null
  where_to_watch?: string | null
  clinical_notes?: string | null
  related_schemas?: string[] | null
  intervention_ideas?: string | null
}

export type LibraryWorkRow = {
  id: string
  display_title: string
  work_type: string
  is_animation?: boolean | null
  year?: number | null
  genres?: string[] | null
  duration?: string | null
  seasons?: number | null
  rating?: string | null
  synopsis?: string | null
  cover_url?: string | null
  intensity?: number | null
  patient_layer?: LibraryWorkLayer | null
  therapist_layer?: LibraryWorkLayer | null
}

export type LibraryIndicationRow = {
  id: string
  work_id: string
  patient_id: string
  indicated_by?: string | null
  created_at: string
  work?: LibraryWorkRow | null
}

export type PsychoeducationCard = {
  title?: string | null
  imageUrl?: string | null
  patientText?: string | null
  therapistText?: string | null
  reflection?: string | null
  exercise?: string | null
}

export type PsychoeducationModuleRow = {
  id: string
  number: number
  stage: string
  title: string
  presentation?: string | null
  closing?: string | null
  accent_color?: string | null
  cover_url?: string | null
  cards?: PsychoeducationCard[] | null
}

export type GenogramPersonRow = {
  id: string
  clinic_id?: string
  patient_id?: string
  created_by?: string | null
  full_name: string
  nickname?: string | null
  relationship_to_patient?: string | null
  gender?: string | null
  birth_year?: number | null
  death_year?: number | null
  is_deceased?: boolean | null
  caregiver_role?: string | null
  illness_type?: string | null
  pregnancy_loss_type?: string | null
  notes?: string | null
  is_sensitive?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export type GenogramRelationshipRow = {
  id: string
  clinic_id?: string
  patient_id?: string
  person_a_id: string
  person_b_id: string
  relationship_type: string
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type GenogramData = {
  persons: GenogramPersonRow[]
  relationships: GenogramRelationshipRow[]
}

// ── Conceitualização de caso (espelha o modelo do app Flutter) ────────────────

export type UnmetNeed = {
  need_key: string
  rating?: string | null   // '0'–'5' ou 'X' (informação insuficiente)
  origin?: string | null
  schemas?: string | null
}

export type ModeSequence = {
  trigger?: string | null
  activated_modes?: string | null
  coping_mode?: string | null
  sequence?: string | null
  effect?: string | null
  perpetuation?: string | null
}

export type TherapeuticRelationship = {
  collaboration_rating?: number | null   // 1–5
  collaboration_notes?: string | null
  bond_rating?: number | null            // 1–5
  bond_notes?: string | null
  therapist_reactions?: string | null
}

export type GeneralImpressions = {
  initial?: string | null
  current?: string | null
}

export type DiagnosisItem = {
  name?: string | null
  code?: string | null
}

export type CaseDiagnosis = {
  system?: string | null   // 'CID-11' | 'DSM-5-TR'
  items?: DiagnosisItem[]
}

export type CaseOrigins = {
  early_history?: string | null
  temperament?: string | null
  cultural?: string | null
}

export type CaseConceptualizationRow = {
  id: string
  patient_id: string
  clinic_id?: string | null
  unmet_needs?: UnmetNeed[] | null
  mode_sequences?: ModeSequence[] | null
  therapeutic_relationship?: TherapeuticRelationship | null
  general_impressions?: GeneralImpressions | null
  diagnosis?: CaseDiagnosis | null
  origins?: CaseOrigins | null
  motivo_notes?: string | null
  additional_comments?: string | null
  updated_at?: string | null
}

// ── Avaliação inicial — tabelas do app Flutter ────────────────────────────────

export type PatientIntakeRow = {
  patient_id: string
  reason_for_seeking?: string | null
  problem_duration?: string | null
  main_discomfort?: string | null
  expectations?: string | null
  related_event?: string | null
  completed_at?: string | null
  filled_by_role?: string | null
}

export type PatientClinicalIntakeRow = {
  patient_id: string
  initial_observations?: string | null
  main_complaint?: string | null
  current_problem?: string | null
  precipitating_factors?: string | null
  patient_goals?: string | null
  motivation?: string | null
  initial_hypotheses?: string | null
  updated_by_profile_id?: string | null
}

export type PatientLifeAreaRow = {
  patient_id: string
  area_key: string
  score?: number | null
  suffering?: number | null
  guided_answer?: string | null
  filled_by_role?: string | null
  assessed_at?: string | null
}

export type PatientClinicalImpressionsRow = {
  patient_id: string
  observed_temperament?: string | null
  therapeutic_bond?: string | null
  resources?: string | null
  vulnerabilities?: string | null
  hypotheses?: string | null
  previous_diagnoses?: string | null
  differential_diagnosis?: string | null
  functioning_level?: string | null
  therapeutic_priorities?: string | null
  schema_hypotheses_text?: string | null
  mode_hypotheses_text?: string | null
  emotional_needs_text?: string | null
}

export type ClinicalHypothesisRow = {
  id: string
  kind: string
  body: string
}

export type PatientFamilyContextRow = {
  patient_id: string
  family_climate?: string[] | null
  family_climate_other?: string | null
  transgenerational_patterns?: string[] | null
  transgenerational_patterns_other?: string | null
  filled_by_role?: string | null
}

export type GenogramFamilyPatternsRow = {
  patient_id: string
  pattern_keys?: string[] | null
  other_text?: string | null
}

export type TimelineEventNoteRow = {
  event_id: string
  clinical_comment?: string | null
}

export type GenogramPersonNoteRow = {
  person_id: string
  clinical_comment?: string | null
}

export type PatientLifeAreaNoteRow = {
  patient_id: string
  area_key: string
  clinical_comment?: string | null
}

export type SchemaActivationRow = {
  id: string
  questionnaire_response_id: string
  schema_code: string
  schema_name: string
  psi_observation?: string | null
  created_at?: string | null
}

// ── PersonalityDomainScore (original) ────────────────────────────────────────
export type PersonalityDomainScore = {
  domain: string
  score?: number | null
  classification?: string | null
  note?: string | null
}

export type PersonalityResults = {
  domains?: PersonalityDomainScore[] | null
  summary?: string | null
}

export type PersonalityClinicalSynthesis = {
  summary?: string | null
  strengths?: string[] | null
  vulnerabilities?: string[] | null
  clinical_hypotheses?: string[] | null
  patient_summary?: string | null
}

export type PersonalityConceptualizationIntegration = {
  schema_links?: string[] | null
  mode_links?: string[] | null
  therapy_implications?: string | null
}

export type PersonalityAssessmentRow = {
  id: string
  patient_id: string
  instrument: string
  results?: PersonalityResults | null
  applied_on?: string | null
  application_form?: string | null
  protocol_validity?: string | null
  shared_with_patient?: boolean | null
  clinical_synthesis?: PersonalityClinicalSynthesis | null
  conceptualization_integration?: PersonalityConceptualizationIntegration | null
  created_at?: string | null
  updated_at?: string | null
}

export type ClinicalReportIncludeOptions = {
  questionnaires: boolean
  mental_map: boolean
  goals: boolean
  problems: boolean
  check_ins: boolean
  daily_monitors: boolean
  timeline: boolean
  genogram: boolean
}

export type ClinicalReportPdfResult = {
  blob: Blob
  filename: string
}

export type PsychologistAlertKind = 'expiringInvitation' | 'staleQuestionnaire' | 'missingCheckin' | 'pendingResultsRelease' | string

export type ClinicalAlertSeverity = 'danger' | 'warning' | 'info' | 'success'

export type PsychologistAlertRow = {
  id: string
  kind: PsychologistAlertKind
  severity: ClinicalAlertSeverity
  patient_id?: string | null
  patient_name?: string | null
  title: string
  message: string
  action_label?: string | null
  due_at?: string | null
  created_at?: string | null
}

export type PatientDataCompletionRow = {
  patient_id: string
  completion_rate: number
  completed_fields?: number | null
  total_fields?: number | null
  missing_fields?: string[] | null
}

export type PatientQuestionnaireAssignmentRow = {
  id: string
  questionnaire_id: string
  assigned_by_profile_id: string
  assigned_at: string
  message?: string | null
  response_id?: string | null
  cancelled_at?: string | null
}

export type PatientAvailableQuestionnaireRow = {
  id: string
  code: string
  name: string
  description?: string | null
  clinical_status?: string | null
  is_active: boolean
  is_assigned: boolean
}

export type PatientPortalQuestionnaireAssignment = {
  id: string
  patient_id: string
  questionnaire_id: string
  assigned_at: string
  message?: string | null
  response_id?: string | null
  questionnaire_name: string
  questionnaire_code: string
  questionnaire_description?: string | null
  response_status?: string | null
  response_completed_at?: string | null
}

export type QuestionnaireSessionQuestion = {
  id: string
  code: string
  text: string
  order_index: number
  answer_type: string
  scale_min?: number | null
  scale_max?: number | null
}

export type QuestionnaireSessionContext = {
  id: string
  context_key: string
  context_label: string
  sort_order: number
}

export type QuestionnaireSessionAnswer = {
  id: string
  question_id: string
  response_context_id?: string | null
  answer_value: number
}

export type QuestionnaireSessionData = {
  response_id: string
  patient_id: string
  questionnaire_id: string
  questionnaire_code: string
  questionnaire_name: string
  status: string
  questions: QuestionnaireSessionQuestion[]
  contexts: QuestionnaireSessionContext[]
  answers: QuestionnaireSessionAnswer[]
}

export type PatientDetailData = {
  patient: Patient
  clinic: Clinic | null
  psychologist: UserProfile | null
  totals: {
    responses: number
    completedResponses: number
    draftResponses: number
    cancelledResponses: number
    problems: number
    activeProblems: number
    goals: number
    activeGoals: number
    checkIns: number
    dailyMonitors: number
    auditEvents: number
  }
  responses: PatientQuestionnaireResponseRow[]
  responseResults: PatientQuestionnaireResultRow[]
  responseAnswers: PatientQuestionnaireAnswerRow[]
  problems: PatientProblemRow[]
  goals: TherapyGoalRow[]
  checkIns: PatientCheckInRow[]
  dailyMonitors: DailyMonitorRow[]
  timelineEvents: PatientTimelineEventRow[]
  resources: TherapyResourceRow[]
  questionnaireAssignments: PatientQuestionnaireAssignmentRow[]
  availableQuestionnaires: PatientAvailableQuestionnaireRow[]
  monthlyResponses: ReportMonthlyPoint[]
  auditEvents: AuditEventRow[]
}
export type PlatformPlan = {
  id: string
  code: string
  name: string
  description?: string | null
  monthly_price_cents: number
  is_active: boolean
  default_limits: Record<string, unknown>
  default_features: Record<string, unknown>
  created_at: string
  updated_at?: string | null
}

export type ClinicPlanAssignment = {
  id?: string
  clinic_id: string
  plan_id?: string | null
  commercial_status: string
  starts_at: string
  ends_at?: string | null
  notes?: string | null
  updated_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type ClinicFeatureEntitlement = {
  id?: string
  clinic_id: string
  feature_key: string
  feature_name: string
  is_enabled: boolean
  limit_value?: number | null
  notes?: string | null
  updated_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type ClinicPlanRow = {
  clinic: Clinic
  assignment: ClinicPlanAssignment | null
  plan: PlatformPlan | null
  features: ClinicFeatureEntitlement[]
  users: number
  psychologists: number
  activePatients: number
}

export type PlansData = {
  plans: PlatformPlan[]
  rows: ClinicPlanRow[]
  featureCatalog: Array<{ key: string; name: string }>
}

