# Arquitetura Docker autocontida — VivianiCRM

**Data:** 2026-08-31  
**Status:** implantacao inicial em VPS por IP  
**Decisao:** PostgreSQL, Redis, API, CRM, landing e proxy reverso rodam na mesma VPS via Docker Compose.

## Objetivo

Permitir uma apresentacao funcional sem Vercel, Supabase, Render ou Upstash. O banco nasce vazio na VPS, recebe as migrations versionadas e um seed idempotente, e os dados ficam em volumes Docker.

## Servicos e fronteiras

| Servico | Funcao | Rede externa |
|---|---|---|
| `nginx` | entrada da landing e health publico | `80` |
| `landing` | site publico Next.js | `3000` somente na rede Docker |
| `crm` | painel autenticado Next.js | `3001` |
| `api` | API Express, Socket.IO e jobs | `4000` |
| `postgres` | persistencia Prisma | somente rede Docker |
| `redis` | cache, tokens e rate limit | somente rede Docker |

O acesso direto por IP usa `http://87.76.215.134`, `http://87.76.215.134:3001` e `http://87.76.215.134:4000`. O TLS fica pendente até existir domínio ou certificado emitido para IP.

## Dados e inicializacao

- `postgres_data`: banco novo e persistente.
- `redis_data`: cache e sessoes persistentes.
- `api_data`: uploads locais e logs da API.
- `api-entrypoint.sh`: em uma instalação explicitamente marcada como fresca (`FRESH_DATABASE=true`), aplica o schema atual com `prisma db push`, registra as migrations de feature existentes como baseline e cria um marcador persistente; depois usa `prisma migrate deploy` normalmente. O seed roda somente quando `SEED_ON_START=true`.
- O runtime da API usa `POSTGRES_APP_USER`/`POSTGRES_APP_PASSWORD`, uma role sem privilégios administrativos. Migrations usam `MIGRATION_DATABASE_URL` somente durante o entrypoint; a variável é removida antes do processo da API iniciar. Em instalações existentes, aplicar `sh deploy/vps/ensure-runtime-db-role.sh` antes de reiniciar a API.
- `prisma/seed.ts`: apenas `upsert`; nao remove leads, usuarios ou transacoes.

## Segredos

O arquivo `deploy/vps/.env` e criado somente na VPS a partir do exemplo e permanece fora do Git. As chaves RSA sao armazenadas em base64 para nao quebrar o arquivo de ambiente. Nenhum segredo de Vercel, Supabase ou Upstash e necessario.

## Operacao

```bash
docker compose --env-file deploy/vps/.env up -d --build
docker compose --env-file deploy/vps/.env ps
docker compose --env-file deploy/vps/.env logs -f api
sh deploy/vps/backup.sh
```

Rollback de aplicacao: voltar ao commit anterior e reconstruir as imagens. Rollback de banco nao e automatico; toda migration nova precisa de reversao documentada antes de ser aplicada.

## Estado verificado em 2026-08-31

- VPS `87.76.215.134`: Docker 29.1.3, Compose 2.40.3; seis servicos saudaveis.
- Portas publicas: `80` (Nginx/Landing), `3001` (CRM), `4000` (API). PostgreSQL e Redis nao publicam portas no host.
- Banco inicial vazio criado em volume Docker; 17 tabelas Prisma, 2 usuarios seed e nenhum dado migrado.
- Esta configuracao e de apresentacao via IP/HTTP. TLS, dominio, backup externo e firewall de camada cloud ainda precisam ser configurados antes de producao. O backup local cobre banco e uploads com retenção, mas não substitui uma cópia fora da VPS.
