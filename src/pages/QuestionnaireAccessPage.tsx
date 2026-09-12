import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Lock, ShieldCheck, Unlock, UserRoundCheck } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { FilterBar, SearchField } from '../components/design-system/FilterBar'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { Badge, DataState, EmptyState, PageHeader, StatCard } from '../components/Ui'
import { useAuth } from '../context/auth'
import {
  listClinics,
  listQuestionnaireAccessForProfessional,
  listQuestionnaires,
  listUsers,
  setQuestionnaireProfessionalAccess,
} from '../services/supabaseQueries'
import type { QuestionnaireCatalogItem, UserProfile } from '../types'

function questionCount(item: QuestionnaireCatalogItem) {
  return item.question_count ?? item.questions_count ?? 0
}

function accessEnabled(accessMap: Map<string, boolean>, questionnaireId: string) {
  return accessMap.get(questionnaireId) ?? true
}

export function QuestionnaireAccessPage() {
  const { profile } = useAuth()
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const queryClient = useQueryClient()

  const users = useQuery({ queryKey: ['users'], queryFn: listUsers })
  const clinics = useQuery({ queryKey: ['clinics'], queryFn: listClinics })
  const questionnaires = useQuery({ queryKey: ['questionnaires'], queryFn: listQuestionnaires })
  const access = useQuery({
    queryKey: ['questionnaire-access', selectedProfessionalId],
    queryFn: () => listQuestionnaireAccessForProfessional(selectedProfessionalId),
    enabled: Boolean(selectedProfessionalId),
  })

  const clinicById = useMemo(() => new Map((clinics.data ?? []).map((clinic) => [clinic.id, clinic.name])), [clinics.data])
  const psychologists = useMemo(
    () => (users.data ?? []).filter((user) => user.role === 'psychologist' && user.is_active),
    [users.data],
  )
  const selectedProfessional = useMemo(
    () => psychologists.find((user) => user.id === selectedProfessionalId) ?? null,
    [psychologists, selectedProfessionalId],
  )
  const publishedQuestionnaires = useMemo(
    () => (questionnaires.data ?? []).filter((item) => item.is_active && item.clinical_status !== 'suspended'),
    [questionnaires.data],
  )
  const accessMap = useMemo(
    () => new Map((access.data ?? []).map((row) => [row.questionnaire_id, row.is_enabled])),
    [access.data],
  )
  const filteredQuestionnaires = useMemo(
    () => publishedQuestionnaires.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(search.toLowerCase())),
    [publishedQuestionnaires, search],
  )
  const enabledCount = useMemo(
    () => publishedQuestionnaires.filter((item) => accessEnabled(accessMap, item.id)).length,
    [publishedQuestionnaires, accessMap],
  )

  const accessMutation = useMutation({
    mutationFn: ({ questionnaire, enabled }: { questionnaire: QuestionnaireCatalogItem; enabled: boolean }) => {
      if (!selectedProfessional?.clinic_id) throw new Error('Clínica do psicólogo não encontrada.')
      if (!profile?.id) throw new Error('Administrador logado não encontrado.')
      return setQuestionnaireProfessionalAccess({
        clinic_id: selectedProfessional.clinic_id,
        questionnaire_id: questionnaire.id,
        professional_id: selectedProfessional.id,
        granted_by: profile.id,
        is_enabled: enabled,
      })
    },
    onSuccess: async () => {
      setMessage({ tone: 'success', text: 'Permissão atualizada.' })
      await queryClient.invalidateQueries({ queryKey: ['questionnaire-access', selectedProfessionalId] })
    },
    onError: (err) => setMessage({ tone: 'error', text: (err as Error).message }),
  })

  function professionalLabel(user: UserProfile) {
    const clinicName = user.clinic_id ? clinicById.get(user.clinic_id) : null
    return `${user.full_name}${clinicName ? ` · ${clinicName}` : ''}`
  }

  const selectedClinicName = selectedProfessional?.clinic_id ? clinicById.get(selectedProfessional.clinic_id) : null

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Permissões clínicas"
        title="Acesso a questionários"
        description="Libere ou bloqueie quais instrumentos cada psicólogo pode visualizar e aplicar no aplicativo."
      />
      {message ? <InlineNotice tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} autoDismissMs={message.tone === 'success' ? 4000 : undefined} /> : null}

      <section className="panel access-selector-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Profissional</span>
            <h2>Selecione o psicólogo</h2>
          </div>
          <UserRoundCheck size={22} aria-hidden="true" />
        </div>
        <DataState loading={users.isLoading || clinics.isLoading} error={users.error || clinics.error}>
          <select className="large-select" value={selectedProfessionalId} onChange={(event) => setSelectedProfessionalId(event.target.value)}>
            <option value="">Escolha um psicólogo ativo</option>
            {psychologists.map((user) => <option key={user.id} value={user.id}>{professionalLabel(user)}</option>)}
          </select>
        </DataState>
      </section>

      {!selectedProfessional ? (
        <EmptyState
          icon={ShieldCheck}
          title="Escolha um profissional para começar"
          description="Depois de selecionar um psicólogo, o painel exibirá todos os questionários publicados e o status de acesso de cada um."
        />
      ) : (
        <DataState loading={questionnaires.isLoading || access.isLoading} error={questionnaires.error || access.error}>
          <div className="access-context-bar panel">
            <div>
              <span className="eyebrow">Contexto ativo</span>
              <strong>{selectedProfessional.full_name}</strong>
              <p>{selectedProfessional.email}{selectedClinicName ? ` · ${selectedClinicName}` : ''}</p>
            </div>
            <div className="access-context-stats">
              <span><strong>{enabledCount}</strong> liberados</span>
              <span><strong>{publishedQuestionnaires.length - enabledCount}</strong> bloqueados</span>
              <span><strong>{publishedQuestionnaires.length}</strong> publicados</span>
            </div>
          </div>

          <section className="stats-grid three">
            <StatCard label="Psicólogo" value={selectedProfessional.full_name} detail={selectedProfessional.email} icon={UserRoundCheck} />
            <StatCard label="Questionários publicados" value={publishedQuestionnaires.length} detail="instrumentos na plataforma" icon={ClipboardCheck} tone="blue" />
            <StatCard label="Liberados para ele" value={enabledCount} detail={`${publishedQuestionnaires.length - enabledCount} bloqueados`} icon={Unlock} tone="violet" />
          </section>

          <FilterBar resultCount={filteredQuestionnaires.length} resultLabel="instrumentos">
            <SearchField value={search} onChange={setSearch} placeholder="Buscar questionário por nome ou código" />
          </FilterBar>

          <section className="access-grid">
            {filteredQuestionnaires.map((item) => {
              const enabled = accessEnabled(accessMap, item.id)
              return (
                <article className="access-card" key={item.id}>
                  <div className={enabled ? 'access-icon enabled' : 'access-icon blocked'}>
                    {enabled ? <Unlock size={20} aria-hidden="true" /> : <Lock size={20} aria-hidden="true" />}
                  </div>
                  <div className="access-main">
                    <div className="entity-title-row">
                      <h3>{item.name}</h3>
                      <Badge tone={enabled ? 'success' : 'warning'}>{enabled ? 'Liberado' : 'Bloqueado'}</Badge>
                    </div>
                    <p>{item.description || 'Sem descrição cadastrada.'}</p>
                    <div className="badge-row">
                      <Badge tone="neutral">{item.code}</Badge>
                      <Badge tone="neutral">Versão {item.instrument_version ?? item.version ?? 'não informada'}</Badge>
                      <Badge tone="neutral">{questionCount(item)} questões</Badge>
                    </div>
                  </div>
                  <Button
                    variant={enabled ? 'danger' : 'primary'}
                    size="sm"
                    disabled={accessMutation.isPending}
                    onClick={() => accessMutation.mutate({ questionnaire: item, enabled: !enabled })}
                  >
                    <ClipboardCheck size={16} aria-hidden="true" />
                    {enabled ? 'Bloquear' : 'Liberar'}
                  </Button>
                </article>
              )
            })}
          </section>
        </DataState>
      )}
    </div>
  )
}
