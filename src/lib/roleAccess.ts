import type { AdminProfile, ProfileRole } from '../types'

export const adminRoles = new Set<ProfileRole>(['platform_admin', 'admin'])
export const clinicalRoles = new Set<ProfileRole>(['psychologist'])
export const patientRoles = new Set<ProfileRole>(['patient'])

export function canAccessAdminPanel(profile: AdminProfile | null) {
  return Boolean(profile?.is_active && adminRoles.has(profile.role))
}

export function canAccessWebPanel(profile: AdminProfile | null) {
  return Boolean(profile?.is_active && (adminRoles.has(profile.role) || clinicalRoles.has(profile.role) || patientRoles.has(profile.role)))
}

export function canAccessClinicalWorkspace(profile: AdminProfile | null) {
  return Boolean(profile?.is_active && (adminRoles.has(profile.role) || (profile.role === 'psychologist' && profile.clinic_id)))
}

export function isPlatformAdminScope(profile: AdminProfile | null) {
  return Boolean(profile?.role === 'platform_admin' || (profile?.role === 'admin' && !profile.clinic_id))
}

export function canAccessIdentifiedPatients(profile: AdminProfile | null) {
  return Boolean(profile?.is_active && profile.role === 'admin' && profile.clinic_id)
}

export function canManagePatientInvitations(profile: AdminProfile | null) {
  return Boolean(profile?.is_active && profile.clinic_id && (profile.role === 'admin' || profile.role === 'psychologist'))
}

export function canManageClinicContent(profile: AdminProfile | null) {
  return Boolean(profile?.is_active && profile.clinic_id && (profile.role === 'admin' || profile.role === 'psychologist'))
}

export function canAccessPatientPortal(profile: AdminProfile | null) {
  return Boolean(profile?.is_active && profile.role === 'patient')
}

export function profileAccessReason(profile: AdminProfile | null, authError: string | null) {
  if (authError) return `Erro ao carregar perfil: ${authError}`
  if (!profile) return 'Não encontramos um registro em profiles para este usuário logado.'
  if (!profile.is_active) return 'O perfil existe, mas está inativo.'
  if (!adminRoles.has(profile.role) && !clinicalRoles.has(profile.role) && !patientRoles.has(profile.role)) return `O perfil atual é ${profile.role}, e o painel aceita administradores, psicólogos e pacientes ativos.`
  return 'Este painel aceita administradores, psicólogos e pacientes ativos.'
}
