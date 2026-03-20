# DEPLOY_CHECKLIST_FINAL

## Arquitetura final recomendada

- `apps/landing` em Vercel
- `apps/crm` em Vercel
- `apps/api` em servico Node com processo persistente
- PostgreSQL gerenciado
- Redis gerenciado
- object storage para uploads
- logs centralizados e health checks externos

## Backend fora da Vercel

O backend nao deve ir para Vercel neste estado porque depende de:

- processo persistente
- Socket.IO
- jobs internos
- uploads hoje ainda acoplados a filesystem
- readiness check de dependencias

Arquivo de exemplo para deploy da API em Render: [render.yaml](D:/VivianeCRM/viviani-serena-platform/render.yaml)

Observacoes factuais da auditoria em `2026-03-20`:
- o blueprint da API precisa incluir `API_BASE_URL`;
- o exemplo de build/start da API deve usar `corepack enable`;
- Google Calendar e Google Business existem no codigo, mas a homologacao auditada seguia sem OAuth Google configurado.

## Ordem ideal de deploy

1. Provisionar PostgreSQL, Redis e storage.
2. Configurar segredos e variaveis da API.
3. Rodar migrations no banco alvo.
4. Fazer deploy da API e validar `/health/live`, `/health/ready` e `/health/deps`.
5. Configurar o projeto da landing na Vercel.
6. Configurar o projeto do CRM na Vercel.
7. Apontar `NEXT_PUBLIC_API_URL` do frontend para a API real.
8. Configurar `LANDING_REVALIDATE_URL` da API apontando para a landing publicada.
9. Executar smoke tests de login, lead, agenda, financeiro e edicao de conteudo.
10. Liberar trafego de producao.

## Variaveis obrigatorias

### API

- `NODE_ENV`
- `API_HOST`
- `API_PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `ANONYMIZATION_SALT`
- `CORS_ORIGIN`
- `API_BASE_URL`
- `CRM_URL`
- `LANDING_REVALIDATE_URL`
- `REVALIDATE_SECRET`

### API opcionais por integracao

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `ADMIN_EMAIL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `UPLOAD_DIR`
- `MAX_FILE_SIZE`
- `ALLOWED_MIME_TYPES`
- `LOG_LEVEL`
- `LOG_TO_FILES`
- `LOG_DIR`
- `APP_TIMEZONE`
- `BACKUP_ENABLED`

### Landing

- `API_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `CRM_URL`
- `NEXT_PUBLIC_GA_ID`
- `REVALIDATE_SECRET`

### CRM

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `API_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_LANDING_URL`
- `NEXT_PUBLIC_APP_VERSION`

## Checklist de producao

- Segredos reais cadastrados no provider
- Banco e Redis em rede privada ou com ACL
- Migrations executadas antes do start
- API respondendo `200` em `/health/live`
- API respondendo `200` em `/health/ready`
- Frontends publicados com variaveis corretas
- `CORS_ORIGIN` limitado aos dominos reais
- `LANDING_REVALIDATE_URL` aponta para a landing correta
- `REVALIDATE_SECRET` nao existe no client
- Smoke test completo aprovado
- Logs chegando no provider
- Monitor de uptime configurado
- Backup e restore validados

## Checklist de demo

- Banco isolado da producao
- Redis isolado da producao
- Dados mascarados ou seed controlado
- URLs separadas de producao
- Alertas menos agressivos
- Limite de custos e autoscaling revisados

## Smoke tests pos-deploy

- Login no CRM
- Refresh de sessao
- Criacao de lead pela landing
- Lead aparecendo no CRM
- Dashboard carregando metricas sem fallback fake
- Criacao de agendamento
- Criacao de lancamento financeiro
- Publicacao de conteudo da landing pelo CRM
- Upload funcionando

## Rollback

### Aplicacao

- manter release anterior pronta para reativacao
- rollback da API antes de alterar front se a quebra for backend
- rollback de landing e CRM na Vercel por deploy anterior

### Banco

- nunca fazer rollback cego sem snapshot
- tirar snapshot antes de migration destrutiva
- usar restore point ou dump validado

### Conteudo e uploads

- manter copia externa dos uploads
- validar reprocessamento de assets se necessario

## Riscos restantes

- uploads ainda dependem de disco local ate a migracao para object storage
- jobs continuam no processo da API
- historico do editor de conteudo ainda nao e persistido
- notificacoes operacionais ainda nao foram reintroduzidas em trilha real
- tracing distribuido ainda nao foi instrumentado

## Comandos uteis

```bash
pnpm deploy:check
pnpm --filter @viviani/api db:migrate:prod
pnpm --filter @viviani/api start
```
