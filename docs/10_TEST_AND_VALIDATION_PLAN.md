# 10 Test And Validation Plan

## Situacao atual
- nao foram encontrados testes automatizados relevantes
- o build da API falha
- o build do CRM falha
- apenas a landing passou build durante a auditoria

## Testes essenciais

### Auth
- login com credenciais validas
- login invalido e lockout
- refresh token
- fluxo 2FA completo
- troca de senha inicial
- RBAC de rotas administrativas

### Leads
- criacao de lead via landing
- atualizacao de status
- conversao com `convertedAt`
- exportacao CSV
- exclusao ou anonimização LGPD

### Agenda
- criacao de agendamento a partir de lead valido
- sincronizacao com Google Calendar
- cancelamento e atualizacao

### Financeiro
- criacao de receita e despesa
- resumo mensal
- grafico mensal
- ticket medio
- invalidacao de cache ao mudar conversao de lead

### Conteudo
- leitura publica
- edicao autenticada
- upload de imagem
- revalidacao da landing

### Seguranca
- rate limit
- autorizacao de usuarios
- criacao e resolucao de `SecurityEvent`

## Smoke tests minimos
1. `landing` builda.
2. `crm` builda.
3. `api` builda.
4. `/health` responde com banco e Redis saudaveis.
5. login admin funciona.
6. lead criado na landing aparece no CRM.
7. conversao de lead reflete no KPI oficial.
8. lancamento financeiro reflete no KPI oficial.
9. upload de imagem funciona com storage persistente.
10. usuario sem permissao recebe `403` no backend.

## Testes de regressao
- comparar payloads CRM/API com testes de contrato
- garantir que mudancas de enum ou categoria quebrem em CI
- garantir que dashboard nao usa mock aleatorio em producao
- garantir que leads sinteticos nao entram em KPI comercial

## Testes de consistencia de metricas
- fixture controlada com:
  - 10 leads reais
  - 2 eventos de analytics anonimos
  - 3 leads convertidos
  - 2 lancamentos de receita vinculados ao periodo
  - 1 despesa
- validar:
  - dashboard
  - `leads/stats`
  - `financials/summary`
  - endpoint canonico futuro de metricas

## Checklist de build
- `pnpm --filter @viviani/landing build`
- `pnpm --filter @viviani/crm build`
- `pnpm --filter @viviani/api build`
- typecheck dos packages compartilhados

## Checklist de deploy
- secrets corretos por ambiente
- migracao de banco aplicada
- storage acessivel
- Redis acessivel
- health check externo verde
- smoke tests pos-deploy verdes
- logs e alertas ativos

## Criterios objetivos de aceite
- sem segredos expostos no cliente
- build de todos os apps verde
- RBAC administrativo validado por teste
- landing cria lead real com sucesso
- dashboard, leads, financeiro e analytics retornam numeros coerentes para o mesmo periodo e filtros
- deploy e rollback documentados e testaveis
