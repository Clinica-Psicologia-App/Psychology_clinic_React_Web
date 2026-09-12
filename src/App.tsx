import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { FeatureGate } from './components/FeatureGate'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'
import { RouteLoadingState } from './components/Ui'
import { useAuth } from './context/auth'
import { EntitlementsProvider } from './context/EntitlementsContext'
import { canAccessAdminPanel, canAccessClinicalWorkspace, canAccessPatientPortal, canManageClinicContent } from './lib/roleAccess'

const AuditPage = lazy(() => import('./pages/AuditPage').then((module) => ({ default: module.AuditPage })))
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitationPage').then((module) => ({ default: module.AcceptInvitationPage })))
const ClinicDetailPage = lazy(() => import('./pages/ClinicDetailPage').then((module) => ({ default: module.ClinicDetailPage })))
const ClinicsPage = lazy(() => import('./pages/ClinicsPage').then((module) => ({ default: module.ClinicsPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const LibraryWorksPage = lazy(() => import('./pages/LibraryWorksPage').then((module) => ({ default: module.LibraryWorksPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage').then((module) => ({ default: module.PatientDetailPage })))
const PatientGenogramPage = lazy(() => import('./pages/PatientGenogramPage').then((module) => ({ default: module.PatientGenogramPage })))
const PatientInvitationsPage = lazy(() => import('./pages/PatientInvitationsPage').then((module) => ({ default: module.PatientInvitationsPage })))
const PatientOverviewPage = lazy(() => import('./pages/PatientOverviewPage').then((module) => ({ default: module.PatientOverviewPage })))
const PatientQuestionnairesPage = lazy(() => import('./pages/PatientQuestionnairesPage').then((module) => ({ default: module.PatientQuestionnairesPage })))
const PatientMonitoringPage = lazy(() => import('./pages/PatientMonitoringPage').then((module) => ({ default: module.PatientMonitoringPage })))
const PatientInitialAssessmentPage = lazy(() => import('./pages/PatientInitialAssessmentPage').then((module) => ({ default: module.PatientInitialAssessmentPage })))
const PatientLibraryPage = lazy(() => import('./pages/PatientLibraryPage').then((module) => ({ default: module.PatientLibraryPage })))
const PatientLibraryWorkPage = lazy(() => import('./pages/PatientLibraryWorkPage').then((module) => ({ default: module.PatientLibraryWorkPage })))
const PatientPersonalityPage = lazy(() => import('./pages/PatientPersonalityPage').then((module) => ({ default: module.PatientPersonalityPage })))
const PatientResourcesPage = lazy(() => import('./pages/PatientResourcesPage').then((module) => ({ default: module.PatientResourcesPage })))
const PatientPortalResultsPage = lazy(() => import('./pages/PatientPortalResultsPage').then((module) => ({ default: module.PatientPortalResultsPage })))
const PatientsPage = lazy(() => import('./pages/PatientsPage').then((module) => ({ default: module.PatientsPage })))
const PlansPage = lazy(() => import('./pages/PlansPage').then((module) => ({ default: module.PlansPage })))
const PsychoeducationAdminPage = lazy(() => import('./pages/PsychoeducationAdminPage').then((module) => ({ default: module.PsychoeducationAdminPage })))
const PsychoeducationJourneyPage = lazy(() => import('./pages/PsychoeducationJourneyPage').then((module) => ({ default: module.PsychoeducationJourneyPage })))
const PsychoeducationModulePage = lazy(() => import('./pages/PsychoeducationModulePage').then((module) => ({ default: module.PsychoeducationModulePage })))
const PsychologistDetailPage = lazy(() => import('./pages/PsychologistDetailPage').then((module) => ({ default: module.PsychologistDetailPage })))
const QuestionnaireAccessPage = lazy(() => import('./pages/QuestionnaireAccessPage').then((module) => ({ default: module.QuestionnaireAccessPage })))
const QuestionnairesPage = lazy(() => import('./pages/QuestionnairesPage').then((module) => ({ default: module.QuestionnairesPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const TherapyResourcesPage = lazy(() => import('./pages/TherapyResourcesPage').then((module) => ({ default: module.TherapyResourcesPage })))
const UsersPage = lazy(() => import('./pages/UsersPage').then((module) => ({ default: module.UsersPage })))

function PageFallback() {
  return <RouteLoadingState />
}

function RoleHome() {
  const { profile } = useAuth()
  if (profile?.role === 'psychologist') return <Navigate to="/pacientes" replace />
  if (profile?.role === 'patient') return <Navigate to="/meus-questionarios" replace />
  return <DashboardPage />
}

const AdminOnly = ({ children }: { children: React.ReactNode }) => (
  <RoleRoute allow={canAccessAdminPanel}>{children}</RoleRoute>
)

const ClinicalOnly = ({ children }: { children: React.ReactNode }) => (
  <RoleRoute allow={canAccessClinicalWorkspace}>{children}</RoleRoute>
)

const PatientOnly = ({ children }: { children: React.ReactNode }) => (
  <RoleRoute allow={canAccessPatientPortal}>{children}</RoleRoute>
)

const ClinicContentOnly = ({ children }: { children: React.ReactNode }) => (
  <RoleRoute allow={canManageClinicContent}>{children}</RoleRoute>
)

const FeatureOnly = ({ feature, children }: { feature: string; children: React.ReactNode }) => (
  <FeatureGate featureKey={feature}>{children}</FeatureGate>
)

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <EntitlementsProvider>
                <AppLayout />
              </EntitlementsProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleHome />} />
          <Route path="clinicas" element={<AdminOnly><ClinicsPage /></AdminOnly>} />
          <Route path="clinicas/:clinicId" element={<AdminOnly><ClinicDetailPage /></AdminOnly>} />
          <Route path="usuarios" element={<AdminOnly><UsersPage /></AdminOnly>} />
          <Route path="usuarios/:userId" element={<AdminOnly><PsychologistDetailPage /></AdminOnly>} />
          <Route path="visao-pacientes" element={<AdminOnly><PatientOverviewPage /></AdminOnly>} />
          <Route path="convites" element={<ClinicalOnly><FeatureOnly feature="patients"><PatientInvitationsPage /></FeatureOnly></ClinicalOnly>} />
          <Route path="pacientes" element={<ClinicalOnly><FeatureOnly feature="patients"><PatientsPage /></FeatureOnly></ClinicalOnly>} />
          <Route path="pacientes/:patientId" element={<ClinicalOnly><FeatureOnly feature="patients"><PatientDetailPage /></FeatureOnly></ClinicalOnly>} />
          <Route path="recursos-terapeuticos" element={<ClinicContentOnly><FeatureOnly feature="resources"><TherapyResourcesPage /></FeatureOnly></ClinicContentOnly>} />
          <Route path="psicoeducacao" element={<ClinicContentOnly><FeatureOnly feature="psychoeducation"><PsychoeducationJourneyPage staff /></FeatureOnly></ClinicContentOnly>} />
          <Route path="psicoeducacao/:moduleId" element={<ClinicContentOnly><FeatureOnly feature="psychoeducation"><PsychoeducationModulePage staff /></FeatureOnly></ClinicContentOnly>} />
          <Route path="minha-avaliacao-inicial" element={<PatientOnly><PatientInitialAssessmentPage /></PatientOnly>} />
          <Route path="meus-questionarios" element={<PatientOnly><FeatureOnly feature="questionnaires"><PatientQuestionnairesPage /></FeatureOnly></PatientOnly>} />
          <Route path="meu-acompanhamento" element={<PatientOnly><PatientMonitoringPage /></PatientOnly>} />
          <Route path="meus-recursos" element={<PatientOnly><FeatureOnly feature="resources"><PatientResourcesPage /></FeatureOnly></PatientOnly>} />
          <Route path="minha-biblioteca" element={<PatientOnly><FeatureOnly feature="library"><PatientLibraryPage /></FeatureOnly></PatientOnly>} />
          <Route path="minha-biblioteca/:indicationId" element={<PatientOnly><FeatureOnly feature="library"><PatientLibraryWorkPage /></FeatureOnly></PatientOnly>} />
          <Route path="minha-psicoeducacao" element={<PatientOnly><FeatureOnly feature="psychoeducation"><PsychoeducationJourneyPage /></FeatureOnly></PatientOnly>} />
          <Route path="minha-psicoeducacao/:moduleId" element={<PatientOnly><FeatureOnly feature="psychoeducation"><PsychoeducationModulePage /></FeatureOnly></PatientOnly>} />
          <Route path="meu-genograma" element={<PatientOnly><FeatureOnly feature="genogram"><PatientGenogramPage /></FeatureOnly></PatientOnly>} />
          <Route path="minha-personalidade" element={<PatientOnly><FeatureOnly feature="personality"><PatientPersonalityPage /></FeatureOnly></PatientOnly>} />
          <Route path="meus-resultados" element={<PatientOnly><FeatureOnly feature="questionnaires"><PatientPortalResultsPage /></FeatureOnly></PatientOnly>} />
          <Route path="questionarios" element={<AdminOnly><FeatureOnly feature="questionnaires"><QuestionnairesPage /></FeatureOnly></AdminOnly>} />
          <Route path="acesso-questionarios" element={<AdminOnly><FeatureOnly feature="questionnaires"><QuestionnaireAccessPage /></FeatureOnly></AdminOnly>} />
          <Route path="biblioteca" element={<AdminOnly><FeatureOnly feature="library"><LibraryWorksPage /></FeatureOnly></AdminOnly>} />
          <Route path="psicoeducacao-admin" element={<AdminOnly><FeatureOnly feature="psychoeducation"><PsychoeducationAdminPage /></FeatureOnly></AdminOnly>} />
          <Route path="relatorios" element={<AdminOnly><FeatureOnly feature="reports"><ReportsPage /></FeatureOnly></AdminOnly>} />
          <Route path="planos" element={<AdminOnly><PlansPage /></AdminOnly>} />
          <Route path="auditoria" element={<AdminOnly><AuditPage /></AdminOnly>} />
          <Route path="configuracoes" element={<AdminOnly><SettingsPage /></AdminOnly>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}





