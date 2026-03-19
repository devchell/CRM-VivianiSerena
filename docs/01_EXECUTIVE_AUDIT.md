# 01 Executive Audit

## Data de referencia
- Atualizado em `2026-03-19`.
- Reflete o codigo do monorepo em `staging`.

## Resumo executivo
O monorepo esta funcional para operacao em homologacao e evolucao controlada. API, CRM e landing buildam; a autorizacao principal esta concentrada no backend; o fluxo de colaboradores e o 2FA foram redesenhados.

O sistema hoje trabalha com tres perfis de acesso:
- `ADMIN`: acesso total.
- `COLLABORATOR`: operacao em `dashboard`, `leads`, `agenda` e `financeiro`, com liberacao modular.
- `VIEWER`: consulta em `dashboard`, `leads`, `agenda` e `financeiro`, tambem com liberacao modular.

Modulos sensiveis ficam restritos a `ADMIN`:
- `editar-site`
- `seguranca`
- `colaboradores`
- `privacidade`

## Estado atual
- `apps/api`: Express + Prisma + Redis + Socket.IO, com build verde.
- `apps/crm`: Next.js 14 + NextAuth, com build verde.
- `apps/landing`: Next.js 14, com build verde.
- `packages/types`, `packages/utils` e `packages/ui`: pacotes compartilhados usados no build e no deploy.

## Melhorias recentes consolidadas
- Modelo de permissao por perfil e por modulo consolidado.
- 2FA com canais independentes (`celular`, `e-mail` ou ambos), inicialmente desativado.
- Fluxo de colaboradores separado entre `Ativos` e `Inativos`.
- Contas inativas podem ser corrigidas e reenviadas por e-mail antes do primeiro acesso.

## Riscos e pendencias nao bloqueantes
- Ainda nao existe suite E2E cobrindo o sistema inteiro.
- O CRM ainda gera warnings de `no-img-element` em `editar-site`.
- A migracao do banco para as colunas novas de 2FA precisa ser aplicada no banco real quando o Postgres do ambiente estiver acessivel.

## Conclusao
O sistema esta consistente para homologacao e para entrega assistida. O foco daqui para frente deve sair de "corrigir arquitetura basica" e passar para:
- cobertura automatizada;
- observabilidade;
- rotina segura de migracao de banco;
- QA manual orientado por fluxo.
