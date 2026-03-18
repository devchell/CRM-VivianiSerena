# 09 Environment And Secrets

## Objetivo
Este documento organiza as variaveis de ambiente detectadas, identifica o que parece obrigatorio, obsoleto ou inconsistente, e propoe uma governanca de segredo adequada para uma arquitetura 24/7 com landing, CRM, API, banco, Redis, storage e integracoes externas.

O problema atual nao e apenas "falta de `.env.example`". O problema e de modelagem operacional: hoje build, runtime, client, server e infraestrutura compartilham um espaco confuso de configuracao, com segredos duplicados e em alguns casos expostos.

## Diagnostico geral
- Existem variaveis suficientes para a stack operar localmente.
- A organizacao atual esta duplicada entre raiz e apps.
- Ha sinais claros de drift entre codigo, scripts e exemplos.
- Segredos sensiveis foram observados em arquivos `.env` do workspace.
- Algumas variaveis com prefixo publico ou injecao via `next.config` estao sendo usadas para material que deveria ser privado.

## Principais grupos de configuracao detectados

### Banco / cache / storage
- `DATABASE_URL`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `REDIS_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `UPLOAD_DIR`
- `MAX_FILE_SIZE`
- `ALLOWED_MIME_TYPES`

### Auth / seguranca / sessao
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `SESSION_SECRET`
- `CORS_ORIGIN`
- `ALLOWED_ORIGINS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `BCRYPT_ROUNDS`
- `TOTP_ISSUER`
- `ENCRYPTION_KEY`
- `ANONYMIZATION_SALT`
- `REVALIDATE_SECRET`
- `NEXT_PUBLIC_REVALIDATE_SECRET`

### URLs e runtime de apps
- `API_PORT`
- `API_HOST`
- `API_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_VERSION`
- `NEXT_PUBLIC_LANDING_URL`
- `NEXT_PUBLIC_CRM_API_URL`
- `CRM_URL`
- `LANDING_PORT`
- `CRM_PORT`
- `NEXT_PUBLIC_WHATSAPP_URL`
- `NEXT_PUBLIC_GA_ID`

### E-mail / SMS / terceiros
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `ADMIN_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`

### Operacao / backup / SSL
- `LOG_LEVEL`
- `LOG_DIR`
- `BACKUP_ENABLED`
- `BACKUP_RETAIN_DAYS`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `SSL_CERT_PATH`
- `SSL_KEY_PATH`
- `SSL_CERT_EXPIRY_DAYS`
- `DOMAIN`
- `ALERT_WEBHOOK`

## Classificacao recomendada por escopo

### 1. Client-public
Podem aparecer no browser e no build publico:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_LANDING_URL`
- `NEXT_PUBLIC_WHATSAPP_URL`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_APP_VERSION`

Regra:
- nunca carregar segredos aqui
- nunca usar `NEXT_PUBLIC_*` para revalidacao, auth ou credenciais

### 2. Server-runtime
Devem existir apenas no processo server-side:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `ENCRYPTION_KEY`
- `ANONYMIZATION_SALT`
- `NEXTAUTH_SECRET`
- `SMTP_PASS`
- `TWILIO_AUTH_TOKEN`
- `GOOGLE_CLIENT_SECRET`
- `REVALIDATE_SECRET`

### 3. Build-time
Variaveis lidas no build de apps, mas que ainda exigem controle:
- `NEXTAUTH_URL`
- `API_BASE_URL`
- `NEXT_PUBLIC_*`

Regra:
- build-time nao significa publico
- se o valor for segredo, nao deve entrar aqui

### 4. Infra-ops
Configuracao de plataforma, logs, backup e rede:
- `LOG_LEVEL`
- `LOG_DIR`
- `BACKUP_*`
- `SSL_*`
- `DOMAIN`
- `CORS_ORIGIN`
- `ALLOWED_ORIGINS`
- `RATE_LIMIT_*`

## Quais parecem obrigatorias

### API em runtime
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `CORS_ORIGIN` ou configuracao equivalente de origens

### CRM em runtime
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `API_BASE_URL`

### Landing em runtime
- `API_BASE_URL` ou `NEXT_PUBLIC_API_URL`, conforme o caminho efetivamente utilizado

### Integracoes opcionais, mas operacionais
- `SMTP_*`
- `GOOGLE_*`
- `TWILIO_*`

Sem essas integracoes, partes do produto perdem funcionalidade relevante, mesmo que a aplicacao principal suba.

## Quais parecem obsoletas, incoerentes ou suspeitas

### Possivelmente obsoletas
- `SESSION_SECRET`
  - nao houve evidencia clara de uso efetivo no fluxo observado
- `NEXT_PUBLIC_CRM_API_URL`
  - nao apareceu como dependencia clara no codigo lido
- `TOTP_ISSUER`
  - conflita com o fluxo atual observado de 2FA por e-mail/SMS

### Incoerencias de nomenclatura
- `POSTGRES_PORT` e `DATABASE_PORT`
  - coexistem para conceitos parecidos
- `JWT_SECRET`, `JWT_EXPIRY`, `REFRESH_TOKEN_EXPIRY` em scripts antigos
  - nao refletem o que a API parece usar hoje

### Criticamente inadequadas por desenho
- `NEXT_PUBLIC_REVALIDATE_SECRET`
  - segredo publico por definicao, portanto invalido como segredo
- qualquer segredo injetado em `next.config.mjs`
  - vira superficie de exposicao maior do que o necessario

## Riscos de segredos expostos
- Segredos sensiveis foram observados em arquivos `.env` presentes no workspace.
- O mesmo segredo aparece em mais de um lugar, aumentando drift e dificuldade de rotacao.
- `NEXTAUTH_SECRET` foi configurado de modo a poder ser publicado no bundle cliente.
- Ha mistura de segredo operacional, credencial de terceiro e configuracao publica no mesmo conjunto de arquivos.

## Governanca recomendada de segredos

### Principios
- segredo nunca e versionado
- segredo nunca e publico
- segredo nunca e duplicado sem justificativa
- segredo sempre pertence a um ambiente especifico
- segredo sempre tem dono e estrategia de rotacao

### Modelo recomendado por ambiente
- `demo`
- `staging`
- `production`

Cada ambiente deve ter:
- banco proprio
- Redis proprio
- segredos proprios
- buckets proprios
- integracoes ou contas isoladas quando possivel

### Fonte de verdade recomendada
- provedor de segredo do proprio ambiente:
  - Vercel Environment Variables para `landing` e `crm`
  - secret manager da plataforma da API ou servico dedicado

### Processo minimo
1. Inventariar todos os segredos atuais.
2. Rotacionar os que foram expostos.
3. Remover do repositorio e dos `.env` compartilhados.
4. Registrar dono, finalidade e ambiente.
5. Padronizar nomes.

## Estrutura recomendada para `.env.example`
O `.env.example` deve servir como contrato de configuracao, nao como espelho bruto do ambiente local.

### Exemplo recomendado
```dotenv
# App identity
NODE_ENV=
APP_ENV=

# Database
DATABASE_URL=

# Redis
REDIS_URL=

# Auth
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NEXTAUTH_SECRET=
NEXTAUTH_URL=
REVALIDATE_SECRET=

# API / App URLs
API_BASE_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=
NEXT_PUBLIC_LANDING_URL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_VERSION=

# Security
CORS_ORIGIN=
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ENCRYPTION_KEY=
ANONYMIZATION_SALT=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_FROM_NAME=
ADMIN_EMAIL=

# Integrations
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_CALENDAR_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Storage
UPLOAD_BUCKET=
UPLOAD_REGION=
UPLOAD_ACCESS_KEY_ID=
UPLOAD_SECRET_ACCESS_KEY=

# Observability / Ops
LOG_LEVEL=info
SENTRY_DSN=
BACKUP_RETAIN_DAYS=30
```

## Regras operacionais recomendadas

### Para `landing`
- apenas `NEXT_PUBLIC_*` realmente publicos
- sem segredos no build

### Para `crm`
- `NEXTAUTH_SECRET` somente server-side
- URLs publicas separadas de segredos
- nada de segredo em `next.config env`

### Para `api`
- segredos de auth, banco, Redis e terceiros somente em runtime
- nenhuma dependencia de `.env` versionado

### Para storage e integracoes
- buckets e contas separados por ambiente
- credenciais com menor privilegio possivel
- rotacao documentada

## Limpeza recomendada
1. Consolidar nomes duplicados para banco, auth e expiracao.
2. Remover variaveis obsoletas ou sem uso comprovado.
3. Eliminar `NEXT_PUBLIC_REVALIDATE_SECRET`.
4. Remover segredos de `next.config.mjs`.
5. Padronizar `.env.example` como contrato minimo por app e por ambiente.

## Conclusao
O projeto precisa tratar configuracao e segredo como parte da arquitetura, nao como detalhe de ambiente local. Hoje a configuracao esta suficientemente funcional para desenvolvimento, mas inadequada para operacao gerenciada e segura. O alvo correto e uma governanca de segredo por ambiente, com escopo minimo, nomes padronizados, ausencia total de segredos no client e eliminacao das fontes paralelas de configuracao.
## Update apos execucao da refatoracao

- `.env.example` foi revisado para separar melhor runtime, publico e segredos.
- `NEXT_PUBLIC_API_URL` passou a representar a base da API, sem `/api/v1` embutido.
- O CRM nao depende mais de `NEXT_PUBLIC_REVALIDATE_SECRET`.
- Variaveis de revalidacao ficaram concentradas no backend: `LANDING_REVALIDATE_URL` e `REVALIDATE_SECRET`.
