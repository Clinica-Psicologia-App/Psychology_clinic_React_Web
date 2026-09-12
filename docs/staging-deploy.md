# Deploy de Staging

Este guia prepara o painel web para homologacao em um ambiente separado de producao.

## Branches

- `main`: base estavel.
- `staging`: homologacao e validacao com usuarios reais de teste.

## Build

```bash
npm ci
npm run lint
npm run build
```

O build gera a pasta `dist`.

## Variaveis obrigatorias

Configure no provedor de deploy:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_NAME=EsquemaCore Painel
```

Use um projeto Supabase de staging sempre que possivel. Evite apontar a homologacao para dados reais de pacientes antes de concluir os testes de RLS.

## Vercel

Configurar:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Branch de producao ou preview: `staging`, conforme politica do projeto

O arquivo `vercel.json` ja inclui:

- fallback para rotas SPA;
- cache longo para assets versionados;
- headers basicos de seguranca.

## Netlify

Configurar:

- Build command: `npm run build`
- Publish directory: `dist`
- Branch deploy: `staging`

O arquivo `public/_redirects` garante fallback de rotas SPA no build final.

## Smoke test de runtime

Depois do deploy, rode localmente com credenciais de teste:

```bash
set SMOKE_EMAIL=psicologo.teste@exemplo.com
set SMOKE_PASSWORD=senha-de-teste
set SMOKE_PATIENT_ID=uuid-do-paciente
npm run smoke:supabase
```

Validar manualmente:

- login por papel;
- criacao de paciente;
- convites;
- atribuicao e resposta de questionarios;
- liberacao de resultados;
- download de PDF clinico;
- bloqueios por entitlements;
- RLS entre clinicas e papeis.

## Criterio para promover para producao

- CI verde em `staging`.
- Smoke test com usuario real de teste aprovado.
- QA visual desktop/mobile aprovado.
- Matriz de RLS por papel aprovada.
- Variaveis de ambiente registradas.
- Plano de rollback definido.
