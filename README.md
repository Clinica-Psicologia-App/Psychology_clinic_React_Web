# React + TypeScript + Vite

## EsquemaCore Web Panel

Roadmap de paridade com o app mobile e etapas seguras de implementacao:

- [docs/web-mobile-parity-roadmap.md](docs/web-mobile-parity-roadmap.md)
- [docs/production-hardening-checklist.md](docs/production-hardening-checklist.md)
- [docs/staging-deploy.md](docs/staging-deploy.md)

Comandos principais:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run smoke:supabase
```

Branches:

- `main`: base estavel.
- `staging`: homologacao.

Deploy:

- Vercel: usar `npm run build` e publicar `dist`.
- Netlify: usar `npm run build` e publicar `dist`.
- Configurar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_APP_NAME` no provedor.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
