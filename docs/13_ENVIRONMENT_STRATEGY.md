# 13 Environment Strategy

## Objetivo

Definir uma estrategia segura para operar o mesmo sistema em dois ambientes:

- homologacao
- producao

Sem duplicar a base de codigo, sem criar dois repositorios e sem misturar dados ou infraestrutura.

## Recomendacao principal

Use:

- 1 repositorio
- 1 codebase
- 2 ambientes isolados
- 3 tipos de branch

Branches:

- `main`: producao
- `staging`: homologacao
- `feature/*`: desenvolvimento isolado

Esse modelo reduz risco operacional, simplifica manutencao e evita divergencia entre sistemas.

## O que nao fazer

Nao recomendado:

- criar dois repositorios para o mesmo produto
- manter duas codebases separadas
- usar o mesmo banco em homologacao e producao
- usar o mesmo Redis em homologacao e producao
- usar o mesmo bucket de uploads em homologacao e producao
- fazer deploy manual direto em producao sem passar por homologacao

## Estrutura recomendada

### GitHub

- branch `main`
- branch `staging`
- branches `feature/*`

### Vercel

- `landing-hml`
- `landing-prod`
- `crm-hml`
- `crm-prod`

### Render

- `api-hml`
- `api-prod`

### Banco

- `postgres-hml`
- `postgres-prod`

### Redis

- `redis-hml`
- `redis-prod`

### Storage

- `bucket-hml`
- `bucket-prod`

## Dominios sugeridos

### Homologacao

- `hml.seudominio.com` para a landing
- `hml-crm.seudominio.com` para o CRM
- `hml-api.seudominio.com` para a API

### Producao

- `seudominio.com` para a landing
- `crm.seudominio.com` para o CRM
- `api.seudominio.com` para a API

## Fluxo recomendado de trabalho

### Desenvolvimento

1. criar branch `feature/nome-da-mudanca`
2. desenvolver e validar localmente ou por build
3. abrir PR para `staging`
4. fazer merge em `staging`
5. deploy automatico em homologacao
6. validar com a cliente
7. corrigir em novas `feature/*` voltando sempre para `staging`
8. quando homologacao estiver aprovada, abrir PR de `staging` para `main`
9. fazer merge em `main`
10. deploy automatico em producao

### Regra de seguranca

- `main` nunca deve receber commit direto
- `staging` idealmente tambem nao deve receber commit direto
- tudo deve passar por PR

## Protecao de branch no GitHub

Ative no minimo:

### `main`

- bloquear push direto
- exigir PR para merge
- exigir branch atualizada antes do merge
- exigir status checks quando houver CI

### `staging`

- bloquear push direto
- exigir PR para merge
- exigir status checks quando houver CI

## Mapeamento de deploy por branch

### Homologacao

- Vercel `landing-hml` acompanha branch `staging`
- Vercel `crm-hml` acompanha branch `staging`
- Render `api-hml` acompanha branch `staging`

### Producao

- Vercel `landing-prod` acompanha branch `main`
- Vercel `crm-prod` acompanha branch `main`
- Render `api-prod` acompanha branch `main`

## Isolamento obrigatorio por ambiente

Cada ambiente precisa ter:

- banco proprio
- Redis proprio
- segredos proprios
- URLs proprias
- uploads proprios
- analytics separados quando possivel
- logs separados

## Variaveis por ambiente

### Homologacao

API:

- `API_BASE_URL=https://hml-api.seudominio.com`
- `CRM_URL=https://hml-crm.seudominio.com`
- `CORS_ORIGIN=https://hml.seudominio.com,https://hml-crm.seudominio.com`
- `LANDING_REVALIDATE_URL=https://hml.seudominio.com/api/revalidate`

Landing:

- `API_BASE_URL=https://hml-api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://hml-api.seudominio.com`
- `CRM_URL=https://hml-crm.seudominio.com`

CRM:

- `API_BASE_URL=https://hml-api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://hml-api.seudominio.com`
- `NEXT_PUBLIC_LANDING_URL=https://hml.seudominio.com`
- `NEXTAUTH_URL=https://hml-crm.seudominio.com`

### Producao

API:

- `API_BASE_URL=https://api.seudominio.com`
- `CRM_URL=https://crm.seudominio.com`
- `CORS_ORIGIN=https://seudominio.com,https://crm.seudominio.com`
- `LANDING_REVALIDATE_URL=https://seudominio.com/api/revalidate`

Landing:

- `API_BASE_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://api.seudominio.com`
- `CRM_URL=https://crm.seudominio.com`

CRM:

- `API_BASE_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_API_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_LANDING_URL=https://seudominio.com`
- `NEXTAUTH_URL=https://crm.seudominio.com`

## Estrategia de dados

### Homologacao

Use:

- dados de teste
- seed controlado
- mascaramento de dados se houver copia de producao

Evite:

- uso do banco de producao
- envio real de comunicacoes sem controle

### Producao

Use:

- banco oficial
- Redis oficial
- bucket oficial
- segredos oficiais

## Estrategia de validacao com a cliente

Homologacao deve ser o ambiente de apresentacao e aprovacao.

Fluxo:

1. subir mudancas em `staging`
2. validar tecnicamente
3. apresentar para a cliente em homologacao
4. anotar ajustes
5. corrigir em novas branches
6. repetir ate aprovacao final
7. promover para `main`

## Promocao para producao

A promocao ideal e:

1. congelar novas mudancas em `staging`
2. revisar variaveis de producao
3. garantir migrations prontas
4. abrir PR `staging -> main`
5. fazer merge
6. acompanhar deploy de API, landing e CRM
7. executar smoke tests de producao

## Smoke tests por ambiente

### Homologacao

- landing abre corretamente
- CRM abre corretamente
- login funciona
- dashboard carrega metricas
- criacao de lead funciona
- lead aparece no CRM
- agenda funciona
- financeiro funciona
- publicacao da landing funciona

### Producao

- health checks da API respondem
- login funciona
- dashboard coerente
- lead real entra corretamente
- CRM sem erro de sessao
- revalidacao da landing funciona
- logs sem erro critico logo apos deploy

## Rollback

### Homologacao

- pode redeployar rapidamente a release anterior
- pode resetar dados de homologacao se necessario

### Producao

- rollback da landing e do CRM pela Vercel
- rollback da API pela Render
- rollback de banco apenas com snapshot ou restore point validado

## Ordem de configuracao recomendada

1. criar branch `staging`
2. configurar protecao de branch
3. criar projetos `hml` na Vercel e na Render
4. criar banco, Redis e storage de homologacao
5. configurar variaveis de homologacao
6. subir homologacao
7. validar com cliente
8. criar projetos de producao
9. configurar producao
10. promover `staging` para `main`

## Resumo executivo

O desenho correto para este projeto e:

- um unico repositorio
- branch `staging` para homologacao
- branch `main` para producao
- infraestrutura separada por ambiente
- deploy automatico por branch
- aprovacao em homologacao antes de qualquer promocao para producao
