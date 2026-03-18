# Upload do Sistema

Este guia e o passo a passo operacional para colocar o projeto no ar com a arquitetura recomendada:

- `apps/landing` na Vercel
- `apps/crm` na Vercel
- `apps/api` na Render
- PostgreSQL gerenciado
- Redis gerenciado
- object storage para uploads

Nao publique a API na Vercel neste estado. Ela depende de processo persistente, jobs internos, Socket.IO e readiness checks.

## 1. O que fazer primeiro

Antes de subir qualquer coisa:

1. Confirme que o repositorio nao vai incluir segredos nem arquivos locais.
2. Suba o codigo para o GitHub.
3. Provisione os servicos gerenciados.
4. Configure a API na Render.
5. Configure a landing na Vercel.
6. Configure o CRM na Vercel.
7. Rode os testes de smoke e so depois libere uso real.

## 2. Limpeza antes do primeiro push

Verifique localmente:

```bash
pnpm install
pnpm build:release
```

Arquivos que nao devem ir para o GitHub:

- `.env`
- `apps/api/.env`
- `apps/api/uploads/*`
- `apps/api/logs/*`
- `node_modules`
- `.next`
- `dist`
- `iniciar.log`
- `backups`
- `.vercel`

O `.gitignore` ja foi ajustado para a estrutura atual do monorepo.

Se voce ja adicionou algum segredo ao git em algum momento, remova antes do push:

```bash
git rm --cached .env
git rm --cached -r apps/api/uploads apps/api/logs
```

## 3. Subida inicial para o GitHub

Na raiz do projeto:

```bash
git status
git add .
git commit -m "chore: prepare production deployment"
git push origin main
```

Se for a primeira publicacao:

```bash
git branch -M main
git remote add origin <URL_DO_REPOSITORIO>
git push -u origin main
```

## 4. Provedores recomendados

Para subir rapido e com menos atrito:

- PostgreSQL: Neon, Supabase ou Render Postgres
- Redis: Upstash ou Render Redis
- Storage: Cloudflare R2 ou Amazon S3
- API: Render Web Service
- Frontends: Vercel
- Uptime monitor: Better Stack, UptimeRobot ou Render Health Check + monitor externo

## 5. Ordem correta de provisionamento

Crie nesta ordem:

1. Banco PostgreSQL
2. Redis
3. Bucket de storage
4. Servico da API na Render
5. Projeto da landing na Vercel
6. Projeto do CRM na Vercel

## 6. Variaveis obrigatorias

## API na Render

Obrigatorias:

- `NODE_ENV=production`
- `APP_TIMEZONE=America/Sao_Paulo`
- `API_HOST=0.0.0.0`
- `API_PORT=4000`
- `API_BASE_URL=https://api.seudominio.com`
- `CRM_URL=https://crm.seudominio.com`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `ANONYMIZATION_SALT`
- `CORS_ORIGIN=https://seudominio.com,https://crm.seudominio.com`
- `LANDING_REVALIDATE_URL=https://seudominio.com/api/revalidate`
- `REVALIDATE_SECRET`

Recomendadas:

- `LOG_LEVEL=info`
- `LOG_TO_FILES=false`
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX=100`
- `UPLOAD_DIR=/tmp/uploads`

Opcionais por integracao:

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

## Landing na Vercel

- `API_BASE_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://api.seudominio.com`
- `CRM_URL=https://crm.seudominio.com`
- `NEXT_PUBLIC_GA_ID=<se usar analytics>`
- `REVALIDATE_SECRET=<mesmo segredo usado na API>`

## CRM na Vercel

- `NEXTAUTH_SECRET=<mesmo segredo do ambiente>`
- `NEXTAUTH_URL=https://crm.seudominio.com`
- `API_BASE_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_LANDING_URL=https://seudominio.com`
- `NEXT_PUBLIC_APP_VERSION=1.0.0`

## 7. Deploy da API na Render

O repositorio ja possui [render.yaml](./render.yaml), mas voce pode configurar pelo painel.

### Passos

1. Entre na Render.
2. Clique em `New +`.
3. Escolha `Web Service`.
4. Conecte o repositorio GitHub.
5. Selecione a branch principal.
6. Use:
   - `Root Directory`: raiz do repo
   - `Runtime`: `Node`
   - `Build Command`:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @viviani/types build && pnpm --filter @viviani/utils build && pnpm --filter @viviani/api db:generate && pnpm --filter @viviani/api build
```

   - `Start Command`:

```bash
corepack enable && pnpm --filter @viviani/api start
```

   - `Health Check Path`: `/health/ready`

7. Cadastre todas as variaveis da API.
8. Salve o servico.
9. Aguarde o build.

### Migracoes

Antes de considerar a API pronta, execute:

```bash
pnpm --filter @viviani/api db:migrate:prod
```

Voce pode fazer isso:

- localmente, apontando `DATABASE_URL` para o banco de producao
- ou via shell da propria Render

### Validacoes obrigatorias da API

Depois do deploy, teste:

- `GET /health/live`
- `GET /health/ready`
- `GET /health/deps`

Exemplo:

```bash
curl https://api.seudominio.com/health/live
curl https://api.seudominio.com/health/ready
curl https://api.seudominio.com/health/deps
```

## 8. Deploy da landing na Vercel

1. Entre na Vercel.
2. Clique em `Add New Project`.
3. Importe o mesmo repositorio.
4. Configure:
   - `Root Directory`: `apps/landing`
   - Framework: `Next.js`
5. Configure as variaveis da landing.
6. Faca o deploy.

Se quiser usar dominio proprio:

- `seudominio.com` para a landing
- `www.seudominio.com` opcional com redirect

## 9. Deploy do CRM na Vercel

1. Crie outro projeto na Vercel com o mesmo repositorio.
2. Configure:
   - `Root Directory`: `apps/crm`
   - Framework: `Next.js`
3. Configure as variaveis do CRM.
4. Faca o deploy.

Dominio recomendado:

- `crm.seudominio.com`

## 10. Conexao entre os tres servicos

Depois que os tres estiverem publicados:

1. Atualize `CORS_ORIGIN` da API com os dominios reais da landing e do CRM.
2. Atualize `LANDING_REVALIDATE_URL` da API para a URL real da landing.
3. Garanta que `NEXT_PUBLIC_API_URL` em landing e CRM aponta para a API real.
4. Garanta que `NEXTAUTH_URL` do CRM aponta para o dominio final do CRM.

Se alterar variaveis, redeploye os apps afetados.

## 11. Smoke tests obrigatorios

Valide na ordem:

1. Landing abre sem erro.
2. CRM abre a tela de login.
3. Login funciona.
4. Dashboard carrega metricas.
5. Criacao de lead via landing funciona.
6. Lead aparece no CRM.
7. Agenda cria agendamento.
8. Financeiro grava lancamento.
9. Edicao/publicacao de conteudo funciona.
10. Health checks continuam `200`.

## 12. Storage de uploads

Hoje o sistema ainda aceita filesystem local. Para producao 24/7, o correto e mover uploads para object storage.

Se for subir imediatamente sem essa migracao:

- trate isso como limitacao temporaria
- nao confie em disco efemero do provider
- nao use multiplas replicas da API para uploads sem storage externo

## 13. Logs e monitoramento

Minimo aceitavel:

- monitor externo batendo em `/health/ready`
- logs da API no provider
- alerta para indisponibilidade
- snapshot/backup do banco configurado no provider

Recomendado:

- Better Stack, Datadog, Logtail ou equivalente
- monitor separado para:
  - API
  - landing
  - CRM

## 14. Rollback

Se algo quebrar:

### Frontends

- volte para o deploy anterior na Vercel

### API

- volte para a release anterior na Render

### Banco

- nao reverta migration no improviso
- use snapshot ou restore point

## 15. Ordem ideal do go-live

1. GitHub organizado e sem segredos
2. Banco e Redis prontos
3. API no ar com health checks verdes
4. Landing no ar
5. CRM no ar
6. Testes de fluxo completo
7. Apontamento de dominio final
8. Liberacao de uso

## 16. Checklist final rapido

Antes de abrir para uso real, confirme:

- repo no GitHub sem `.env`
- API com build verde
- CRM com build verde
- landing com build verde
- banco com migrations aplicadas
- Redis acessivel
- CORS fechado
- segredos reais configurados
- health checks respondendo
- login funcionando
- lead entrando no CRM
- dashboard coerente
- financeiro coerente
- rollback definido

## 17. O que eu recomendo fazer agora

Sua ordem pratica:

1. ajustar e revisar o repositorio local
2. fazer o primeiro push limpo
3. criar banco e Redis
4. publicar a API
5. validar health checks
6. publicar landing
7. publicar CRM
8. testar fluxo completo

Se quiser, o proximo passo eu posso fazer uma checagem final do seu `git status`, te dizer exatamente o que subir no primeiro commit e te guiar no deploy da API na Render campo por campo. 
