# 08 Deployment Architecture

## Arquitetura de entrega

### CI
- workflow: `.github/workflows/ci.yml`
- executa em `main` e `staging`
- valida:
  - lint
  - testes da API
  - build de pacotes compartilhados
  - build de API, CRM e landing

### Homologacao
- workflow: `.github/workflows/deploy-homolog.yml`
- dispara em `staging` ou manualmente
- publica:
  - `landing` via Vercel
  - `crm` via Vercel
  - `api` via Render Deploy Hook
- valida:
  - `/health/live`
  - `/health/ready`
  - `/health/deps`
  - `version` publicada no health endpoint
  - guards de Google Calendar e Google Business quando houver credenciais de smoke
- depende de:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID_LANDING_HML`
  - `VERCEL_PROJECT_ID_CRM_HML`
  - `RENDER_DEPLOY_HOOK_API_HML`
  - `API_HML_BASE_URL`
  - opcional: `API_HML_SMOKE_ADMIN_EMAIL`
  - opcional: `API_HML_SMOKE_ADMIN_PASSWORD`

## Dependencias de runtime
- PostgreSQL
- Redis
- SMTP
- opcionalmente Twilio

## Observacao importante
Mudancas de schema precisam ser aplicadas no banco do ambiente antes de considerar o deploy fechado. O caso atual e a migracao das colunas de 2FA por canal.
