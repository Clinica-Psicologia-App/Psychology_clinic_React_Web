# EsquemaCore Web Panel - Mobile Parity Roadmap

Este documento organiza a evolucao do painel web usando a auditoria do app mobile como referencia tecnica. Ele existe para manter as entregas pequenas, revisaveis e seguras.

## Principios de Seguranca

- Alterar uma frente por vez: permissao, dados, UI e edge functions devem ser validados separadamente.
- Preservar RLS e regras do banco: o web nao deve contornar fluxos que o mobile respeita.
- Separar papeis: admin plataforma, admin/gestor de clinica, psicologo e paciente nao devem compartilhar a mesma superficie sem checagem explicita.
- Evitar expor dados clinicos sensiveis ao admin plataforma. A visao agregada de pacientes deve permanecer sem identificacao individual.
- Validar cada etapa com `npm run build` e `npm run lint` antes de seguir.

## Regras Criticas da Auditoria Mobile

| Regra | Como o web deve tratar |
|---|---|
| Admin plataforma nao ve pacientes individuais | Criar visao agregada por clinica/psicologo e revisar rotas atuais que exibem paciente nominal. |
| Acesso a questionarios tem dois niveis | Manter `questionnaire_professional_access` para psicologo e `patient_questionnaire_assignments` para paciente. |
| Resultado do paciente depende de `results_released_at` | Telas do paciente so exibem resultados quando o campo estiver preenchido. |
| Questionarios contextuais usam `response_context_id` | Resposta/scoring deve tratar cada contexto como instancia separada. |
| Biblioteca tem camadas independentes | Paciente nunca ve camada do terapeuta. |
| Psicoeducacao tem conteudo paciente/terapeuta | Renderizar conforme papel. |
| PDF clinico vem de edge function | Web deve tratar retorno como blob/download. |
| Avatar tem `initials`, `photo`, `custom` | Componentes web precisam renderizar os 3 tipos. |

## Status Atual do Web

| Area | Status | Observacao |
|---|---|---|
| Login/Auth | Implementado | `ProtectedRoute` aceita admin, psicologo e paciente ativos, com home por papel. |
| Clinicas | Implementado | CRUD administrativo e detalhe operacional. |
| Usuarios | Implementado | Staff, limites de pacientes e status. |
| Pacientes | Implementado | Admin plataforma usa visao agregada; contexto clinico usa lista/detalhe nominal com alertas. |
| Questionarios catalogo | Implementado | CRUD de rascunho/perguntas/publicacao/arquivo/duplicacao. |
| Acesso por psicologo | Implementado | Toggle por `questionnaire_professional_access`. |
| Planos/entitlements | Implementado | Administra features e limites; menu/rotas respeitam feature desligada com fallback permissivo quando ausente. |
| Ficha clinica | Implementado | Hub com inteligencia clinica, metas, problemas, timeline, check-ins, monitores, recursos e modulos avancados. |
| Psicologo web | Implementado | Psicologo acessa pacientes, convites, recursos, psicoeducacao e prontuario conforme escopo clinico. |
| Paciente web | Implementado | Paciente responde questionarios, acompanha resultados liberados, monitoramento, recursos, biblioteca, psicoeducacao, genograma e personalidade compartilhada. |
| Biblioteca/Psicoeducacao/Genograma/Personalidade/PDF | Implementado | Telas e fluxos principais implementados; PDF/alertas dependem das Edge Functions/RPCs reais. |

## Etapas de Implementacao

### Etapa 1 - Fundacao de acesso e privacidade

Objetivo: separar claramente o que e plataforma, clinica, psicologo e paciente.

Checklist:

- [x] Criar mapa de papeis e permissoes no frontend.
- [x] Revisar `ProtectedRoute` para centralizar regra de acesso sem abrir dados indevidos.
- [x] Criar rota agregada de pacientes para admin plataforma.
- [x] Revisar links de detalhe de paciente em telas de admin plataforma.
- [x] Garantir que dados nominais de paciente fiquem restritos a contexto permitido no menu, lista, detalhe de paciente, detalhe de clinica e detalhe de psicologo.
- [x] Expandir rotas por papel para psicologo no escopo clinico essencial: pacientes, detalhe de paciente e convites.
- [x] Expandir rotas por papel para paciente no escopo minimo de resultados liberados.

Risco principal: quebrar login/admin atual. Mitigacao: manter rota admin existente funcionando antes de abrir novos papeis.

### Etapa 2 - Convites e acesso do paciente

Objetivo: cobrir criacao/listagem/aceite de convites.

Checklist:

- [x] Listar convites por psicologo/clinica.
- [x] Criar convite para paciente via Edge Function `create-patient-invitation`.
- [x] Aceitar convite via token/deep link usando `/accept-invitation?token=...` e Edge Function `accept-patient-invitation`.
- [x] Exibir status, expiracao e aceite.

Risco principal: duplicidade de perfil/auth. Mitigacao: usar edge functions/RLS existentes e validar email/token no backend.

### Etapa 3 - Questionarios por paciente

Objetivo: implementar o ciclo correto de instrumentos.

Checklist:

- [x] Psicologo ve questionarios permitidos pelo admin no detalhe do paciente, respeitando `questionnaire_professional_access`.
- [x] Psicologo libera/revoga questionario para paciente via `patient_questionnaire_assignments`/Edge Function, com acao bloqueada fora do psicologo responsavel.
- [x] Paciente responde questionario no web via Edge Functions `start-questionnaire`, `submit-questionnaire-answer` e `finish-questionnaire`.
- [x] Suportar contextos em instrumentos contextuais no fluxo do paciente, começando por figuras parentais padrão.
- [x] Psicologo ve respostas, score e breakdown em leitura profissional no detalhe do paciente.
- [x] Psicologo libera/revoga resultados via RPC `set_patient_results_released`, com confirmacao e estado visivel no detalhe do paciente.
- [x] Paciente ve apenas resultados liberados e simplificados.

Risco principal: pular `questionnaire_professional_access`. Mitigacao: bloquear UI e confiar no backend/RLS.

### Etapa 4 - Prontuario operacional

Objetivo: completar os modulos clinicos que ja existem parcialmente.

Checklist:

- [x] Metas terapeuticas CRUD completo, progresso, conclusao, reabertura e arquivamento seguro.
- [x] Problemas clinicos CRUD com intensidade, categoria, resolucao, reabertura e arquivamento seguro.
- [x] Check-ins historico, criacao e detalhe no portal do paciente e leitura no prontuario.
- [x] Monitor diario historico, criacao e detalhe no portal do paciente e leitura no prontuario.
- [x] Linha do tempo CRUD completo e fluxo guiado no prontuario operacional.
- [x] Avaliacao inicial terapeuta/paciente usando campos de intake em `patients`.
- [x] Mapa mental agregado com fonte eficiente a partir do `PatientDetailData` ja carregado.

Risco principal: consultas client-side pesadas. Mitigacao: introduzir RPC/view quando uma tela precisar agregar muitas tabelas.

### Etapa 5 - Conteudos terapeuticos

Objetivo: biblioteca, recursos e psicoeducacao.

Checklist:

- [x] Recursos terapeuticos da clinica com CRUD, ativacao/inativacao e leitura do paciente sem catalogo completo.
- [x] Catalogo admin da biblioteca cinematografica.
- [x] Editor com dados gerais, camada paciente e camada terapeuta.
- [x] Indicacao de obra pelo psicologo.
- [x] Leitura do paciente sem camada terapeuta.
- [x] Catalogo/admin de psicoeducacao.
- [x] Jornada paciente em etapas: Conhecer, Compreender, Transformar.
- [x] Visao terapeuta com conteudo profissional.

Risco principal: vazamento de camada terapeutica. Mitigacao: filtrar por papel no backend sempre que possivel.

### Etapa 6 - Modulos avancados

Objetivo: recursos de diferencial competitivo.

Checklist:

- [x] Genograma com CRUD e diagrama.
- [x] Conceitualizacao de caso.
- [x] Infografico do paciente.
- [x] Personalidade, sintese e compartilhamento.
- [x] Relatorio clinico PDF via edge function.
- [x] Alertas clinicos na home e lista de pacientes.

Risco principal: alto custo de UI e regra clinica. Mitigacao: entregar primeiro leitura/estrutura, depois edicao avancada.

## Criterios de Aceite por Etapa

- Build passa com `npm run build`.
- Lint passa com `npm run lint`.
- Rotas existentes continuam acessiveis para admin.
- Nao ha nova exposicao indevida de dados clinicos.
- Toda nova tela tem estados de carregamento, erro e vazio.
- Toda acao sensivel tem confirmacao, feedback e invalidacao de cache.

## Pendencias de Hardening Antes de Producao

- Validar em runtime as Edge Functions `generate-clinical-report`, `create-patient`, `create-patient-invitation`, `assign-questionnaire`, `start-questionnaire`, `submit-questionnaire-answer` e `finish-questionnaire`.
- Validar as RPCs `get_psychologist_alerts`, `get_patients_data_completion`, `set_patient_results_released`, `set_patient_active_status` e `delete_patient_as_admin`.
- Confirmar RLS por papel com usuarios reais: admin plataforma, admin de clinica, psicologo responsavel, psicologo nao responsavel e paciente.
- Validar em runtime a governanca por `clinic_feature_entitlements` com clinicas reais e features explicitamente desligadas.
- Confirmar contrato de avatar no backend/Auth metadata para `initials`, `photo` e `custom`; o frontend ja renderiza os tres formatos quando os campos sao enviados.
- Fazer QA visual manual em desktop e mobile, incluindo modais longos, tabelas largas, portal do paciente e download de PDF.
- Inicializar versionamento Git e registrar commit/release antes de deploy.

## Ordem Recomendada

1. Etapa 1: acesso e privacidade.
2. Etapa 2: convites.
3. Etapa 3: questionarios por paciente.
4. Etapa 4: prontuario operacional.
5. Etapa 5: conteudos terapeuticos.
6. Etapa 6: avancados.
