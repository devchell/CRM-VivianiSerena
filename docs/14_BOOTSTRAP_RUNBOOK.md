# 14 Bootstrap Runbook

## Estado ja aplicado no repositrio local

As seguintes mudancas ja foram feitas localmente:

- branch atual renomeada de `master` para `main`
- branch `staging` criada

Estado atual esperado:

- `main`
- `staging`

## Objetivo deste runbook

Fechar a configuracao inicial de:

- GitHub
- Vercel homologacao
- Vercel producao
- Render homologacao
- Render producao

Sem quebrar o fluxo de deploy e sem misturar ambientes.

## 1. Publicar as branches corretas no GitHub

Na raiz do projeto:

```bash
git push -u origin main
git push -u origin staging
```

Depois disso:

1. abra o repositrio no GitHub
2. entre em `Settings > Branches`
3. altere a default branch para `main`

Opcional, apenas depois de confirmar que `main` esta publicado corretamente:

```bash
git push origin --delete master
```

## 2. Proteger as branches no GitHub

Em `Settings > Branches > Add rule`:

### Regra para `main`

- branch name pattern: `main`
- marcar `Require a pull request before merging`
- marcar `Require branches to be up to date before merging`
- marcar `Restrict pushes that create files larger than 100 MB` se disponivel
- bloquear push direto

### Regra para `staging`

- branch name pattern: `staging`
- marcar `Require a pull request before merging`
- bloquear push direto

## 3. Criar os projetos da landing na Vercel

Voce vai criar dois projetos separados usando o mesmo repositorio.

### Projeto 1: landing homologacao

No painel da Vercel:

1. `Add New Project`
2. selecione o repositorio
3. project name: `landing-hml`
4. root directory: `apps/landing`
5. framework: `Next.js`
6. production branch: `staging`

Variaveis:

- `API_BASE_URL=https://hml-api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://hml-api.seudominio.com`
- `CRM_URL=https://hml-crm.seudominio.com`
- `NEXT_PUBLIC_GA_ID=<opcional>`
- `REVALIDATE_SECRET=<segredo-hml>`

Dominio sugerido:

- `hml.seudominio.com`

### Projeto 2: landing producao

1. `Add New Project`
2. mesmo repositorio
3. project name: `landing-prod`
4. root directory: `apps/landing`
5. framework: `Next.js`
6. production branch: `main`

Variaveis:

- `API_BASE_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://api.seudominio.com`
- `CRM_URL=https://crm.seudominio.com`
- `NEXT_PUBLIC_GA_ID=<opcional>`
- `REVALIDATE_SECRET=<segredo-prod>`

Dominio sugerido:

- `seudominio.com`

## 4. Criar os projetos do CRM na Vercel

### Projeto 1: CRM homologacao

1. `Add New Project`
2. mesmo repositorio
3. project name: `crm-hml`
4. root directory: `apps/crm`
5. framework: `Next.js`
6. production branch: `staging`

Variaveis:

- `NEXTAUTH_SECRET=<segredo-hml>`
- `NEXTAUTH_URL=https://hml-crm.seudominio.com`
- `API_BASE_URL=https://hml-api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://hml-api.seudominio.com`
- `NEXT_PUBLIC_LANDING_URL=https://hml.seudominio.com`
- `NEXT_PUBLIC_APP_VERSION=1.0.0-hml`

Dominio sugerido:

- `hml-crm.seudominio.com`

### Projeto 2: CRM producao

1. `Add New Project`
2. mesmo repositorio
3. project name: `crm-prod`
4. root directory: `apps/crm`
5. framework: `Next.js`
6. production branch: `main`

Variaveis:

- `NEXTAUTH_SECRET=<segredo-prod>`
- `NEXTAUTH_URL=https://crm.seudominio.com`
- `API_BASE_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_LANDING_URL=https://seudominio.com`
- `NEXT_PUBLIC_APP_VERSION=1.0.0`

Dominio sugerido:

- `crm.seudominio.com`

## 5. Criar os bancos e Redis

Crie recursos separados:

### Homologacao

- `postgres-hml`
- `redis-hml`

### Producao

- `postgres-prod`
- `redis-prod`

Se usar storage:

- `bucket-hml`
- `bucket-prod`

## 6. Criar os servicos da API na Render

Crie dois `Web Services` separados.

### API homologacao

Configuracao:

- service name: `api-hml`
- branch: `staging`
- root directory: repo root
- runtime: `Node`
- build command:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @viviani/types build && pnpm --filter @viviani/utils build && pnpm --filter @viviani/api db:generate && pnpm --filter @viviani/api build
```

- start command:

```bash
corepack enable && pnpm --filter @viviani/api start
```

- health check path:

```text
/health/ready
```

Variaveis obrigatorias:

- `NODE_ENV=production`
- `APP_TIMEZONE=America/Sao_Paulo`
- `API_HOST=0.0.0.0`
- `API_PORT=4000`
- `API_BASE_URL=https://hml-api.seudominio.com`
- `CRM_URL=https://hml-crm.seudominio.com`
- `CORS_ORIGIN=https://hml.seudominio.com,https://hml-crm.seudominio.com`
- `LANDING_REVALIDATE_URL=https://hml.seudominio.com/api/revalidate`
- `REVALIDATE_SECRET=<segredo-hml>`
- `DATABASE_URL=<postgres-hml>`
- `REDIS_URL=<redis-hml>`
- `JWT_PRIVATE_KEY=<rsa-privada-hml>`
- `JWT_PUBLIC_KEY=<rsa-publica-hml>`
- `NEXTAUTH_SECRET=<segredo-hml>`
- `ENCRYPTION_KEY=<chave-hml>`
- `ANONYMIZATION_SALT=<salt-hml>`

Dominio sugerido:

- `hml-api.seudominio.com`

### API producao

Configuracao igual, mudando:

- service name: `api-prod`
- branch: `main`
- `API_BASE_URL=https://api.seudominio.com`
- `CRM_URL=https://crm.seudominio.com`
- `CORS_ORIGIN=https://seudominio.com,https://crm.seudominio.com`
- `LANDING_REVALIDATE_URL=https://seudominio.com/api/revalidate`
- `REVALIDATE_SECRET=<segredo-prod>`
- `DATABASE_URL=<postgres-prod>`
- `REDIS_URL=<redis-prod>`
- segredos proprios de producao

Dominio sugerido:

- `api.seudominio.com`

## 7. Rodar migrations no banco correto

### Homologacao

Use a `DATABASE_URL` do banco de homologacao:

```bash
pnpm --filter @viviani/api db:migrate:prod
```

### Producao

Repita o mesmo comando apontando para o banco de producao:

```bash
pnpm --filter @viviani/api db:migrate:prod
```

Nunca rode migration de producao no banco de homologacao e vice-versa.

## 8. Ordem correta da subida inicial

### Homologacao primeiro

1. publicar `main` e `staging` no GitHub
2. configurar branches protegidas
3. criar `postgres-hml`
4. criar `redis-hml`
5. criar `api-hml`
6. configurar variaveis da API homologacao
7. rodar migration de homologacao
8. validar:
   - `/health/live`
   - `/health/ready`
   - `/health/deps`
9. criar `landing-hml`
10. criar `crm-hml`
11. configurar variaveis da landing e do CRM homologacao
12. validar fluxo completo

### Producao depois

1. criar `postgres-prod`
2. criar `redis-prod`
3. criar `api-prod`
4. configurar variaveis da API producao
5. rodar migration de producao
6. criar `landing-prod`
7. criar `crm-prod`
8. configurar variaveis da landing e do CRM producao
9. validar fluxo completo

## 9. Smoke test obrigatorio de homologacao

Valide:

- landing abre
- CRM abre
- login funciona
- dashboard carrega
- criacao de lead funciona
- lead aparece no CRM
- agenda funciona
- financeiro funciona
- publicacao da landing funciona
- API responde `200` em `/health/live`
- API responde `200` em `/health/ready`

## 10. Fluxo operacional daqui para frente

Para qualquer ajuste:

1. criar `feature/nome-do-ajuste`
2. PR para `staging`
3. homologar com cliente
4. PR de `staging` para `main`
5. publicar em producao

## 11. O que voce deve fazer agora

Na pratica, sua sequencia imediata e:

1. subir `main` e `staging`
2. trocar a default branch no GitHub para `main`
3. configurar branch protection
4. criar homologacao completa
5. validar com a cliente
6. so depois configurar producao
