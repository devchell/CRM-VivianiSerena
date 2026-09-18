# 08 Deployment Architecture

> **Estado vigente — 2026-08-31:** este documento substitui a descrição cloud histórica abaixo. A entrega atual é manual/self-hosted via Docker Compose na VPS, conforme `PRODUCTION_SETUP.md` e `docs/22_VPS_DOCKER_ARCHITECTURE.md`. Não usar Vercel, Render, Supabase ou Upstash.

## Arquitetura de entrega

### CI
- workflow: `.github/workflows/ci.yml`
- executa em `main` e `staging`
- valida:
  - lint
  - testes da API
  - build de pacotes compartilhados
  - build de API, CRM e landing

### Apresentação/homologação vigente
- diretório operacional: `/opt/viviani-crm`
- serviços: Nginx, landing, CRM, API, PostgreSQL 16 e Redis 7
- atualização: `docker compose --env-file deploy/vps/.env up -d --build --force-recreate api crm landing nginx`
- banco e Redis não devem ser recriados durante atualização; volumes são preservados
- validação: `/health`, `/health/live`, `/health/ready`, `/health/deps`, login, leitura de dados e fluxos principais do CRM

## Dependencias de runtime
- PostgreSQL
- Redis
- SMTP
- opcionalmente Twilio

## Observacao importante
Mudanças de schema precisam de migration reversível e validação no banco da VPS antes de considerar o deploy fechado. O ambiente atual foi criado do zero, sem migração de dados; backup externo ainda é pendência.
