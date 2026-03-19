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
- dispara em `staging`
- publica:
  - `landing` via Vercel
  - `crm` via Vercel
- depende de:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID_LANDING_HML`
  - `VERCEL_PROJECT_ID_CRM_HML`

### API
- o repositorio nao contem pipeline de deploy da API.
- a estrategia esperada e branch tracking ou deploy externo pela plataforma do backend.

## Dependencias de runtime
- PostgreSQL
- Redis
- SMTP
- opcionalmente Twilio

## Observacao importante
Mudancas de schema precisam ser aplicadas no banco do ambiente antes de considerar o deploy fechado. O caso atual e a migracao das colunas de 2FA por canal.
