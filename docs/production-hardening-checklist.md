# EsquemaCore Web Panel - Production Hardening Checklist

Use este checklist antes de deploy ou homologacao com cliente.

## 1. Validacao automatizada local

```bash
npm run lint
npm run build
```

## 2. Smoke test Supabase

Sem login, o script valida apenas conectividade publica e pode falhar em RPCs protegidas por RLS.

```bash
npm run smoke:supabase
```

Com usuario real de teste:

```bash
set SMOKE_EMAIL=psicologo.teste@exemplo.com
set SMOKE_PASSWORD=senha-de-teste
set SMOKE_PATIENT_ID=uuid-do-paciente
npm run smoke:supabase
```

Validar:

- `get_current_clinic_entitlements`
- `get_psychologist_alerts`
- `get_patients_data_completion`
- `generate-clinical-report`

## 3. Matriz manual de RLS por papel

| Papel | Deve acessar | Deve bloquear |
|---|---|---|
| Admin plataforma | Dashboard, clinicas, usuarios, visao agregada, relatorios, planos, auditoria | Prontuario individual nominal |
| Admin de clinica | Pacientes da clinica, conteudos, relatorios da clinica | Pacientes de outra clinica |
| Psicologo responsavel | Seus pacientes, convites, liberacao de questionarios/resultados | Paciente de outro responsavel quando RLS exigir |
| Psicologo nao responsavel | Lista permitida pela politica da clinica | Acoes clinicas do paciente sem responsabilidade |
| Paciente | Questionarios liberados, resultados liberados, recursos compartilhados | Camada terapeuta, dados de outros pacientes, resultados nao liberados |

## 4. Edge Functions obrigatorias

- `create-patient`
- `create-patient-invitation`
- `accept-patient-invitation`
- `assign-questionnaire`
- `start-questionnaire`
- `submit-questionnaire-answer`
- `finish-questionnaire`
- `generate-clinical-report`

## 5. Entitlements

Validar com uma clinica de teste:

- Criar/editar entitlements em Planos.
- Desabilitar `resources`, `library`, `psychoeducation`, `questionnaires`, `reports`, `genogram` e `personality`.
- Confirmar que menu e rota somem/bloqueiam.
- Confirmar fallback permissivo quando uma feature nao existe na tabela.

## 6. QA visual

Testar em desktop e mobile:

- Login.
- Lista de pacientes com alertas.
- Detalhe do paciente completo.
- Modais longos de paciente, genograma, personalidade e psicoeducacao.
- Portal do paciente.
- Download do PDF clinico.
- Estados vazio, erro, loading e permissao bloqueada.

## 7. Git e release

- Corrigir permissao do diretorio `.git` se `git status` falhar.
- Criar commit de release.
- Anotar hash do commit publicado.
- Guardar variaveis de ambiente usadas no deploy.
- Definir rollback: build anterior + variaveis anteriores.
