# 07 Dead Code And Deprecation Report

## Resumo
Existe uma combinacao de codigo realmente ocioso, telas legadas, placeholders operacionais e dependencias aparentemente nao utilizadas. Nem tudo deve ser removido de imediato; parte precisa primeiro ser validada em uso real e contra o plano de estabilizacao.

## Update apos limpeza final

Itens removidos com alta confianca:
- `apps/api/prisma/seed.js`
- `apps/api/prisma/reset-access.ts`
- `apps/crm/src/lib/version.ts`
- `apps/crm/src/components/dashboard/RecentLeads.tsx`
- `_setup_env.py`
- `tmp_icon_gen.py`

## Arquivos possivelmente inuteis ou legados

### Alta confianca
- `apps/crm/src/app/(dashboard)/site/page.tsx`
  - editor de site alternativo ou legado

### Baixa confianca
- `apps/api/prisma/reset-password.ts`
  - parecem scripts operacionais ad hoc e exigem validacao antes de remover

## Codigo morto ou nao integrado

### Backend
- `apps/api/src/infrastructure/security/BruteForceDetector.ts`
  - implementado, mas sem integracao efetiva observada no pipeline HTTP
- `apps/api/src/infrastructure/security/AnomalyDetector.ts`
  - existe, mas nao foi encontrado uso real no fluxo principal
- `botDetection` em `apps/api/src/middleware/security.ts`
  - nao foi encontrada montagem no app

### Front-end CRM
- `NotificationBell`
- `apps/crm/src/app/api/notifications/route.ts`
  - hoje retorna vazio; ainda nao representa notificacoes operacionais reais
- historico em `editar-site`
  - trecho estatico

## Componentes nao usados ou com uso duvidoso
- `apps/crm/src/app/(dashboard)/site/page.tsx`

## Endpoints orfaos ou quebrados
- `POST /api/v1/content/publish`
  - corrigido e integrado ao CRM
- `DELETE /api/v1/content/upload/:filename`
  - ordem de roteamento corrigida

## Dependencias possivelmente nao utilizadas

### Backend
- `express-mongo-sanitize`
- `hpp`
- `qrcode`
- `speakeasy`

### Landing
- `socket.io-client`
- `embla-carousel-react`

Essas dependencias precisam de validacao final antes de remocao, mas nao foi encontrada integracao operacional clara durante a auditoria.

## Duplicidades
- dois editores de site no CRM: `/site` e `/editar-site`
- estrategia dupla de auth na API/CRM:
  - cookies httpOnly
  - bearer token explicito

## Placeholders e simulacoes que nao deveriam estar em operacao
- `RevenueChart`: sample data aleatorio
- `LeadsFunnel`: sample data aleatorio
- `RecentActivity`: dados fake
- `NotificationBell`: dados fake
- `security/activity`: volume de trafego parcialmente simulado
- `security/checklist`: itens positivos hardcoded

Observacao:
- `RevenueChart`, `LeadsFunnel` e `RecentActivity` do dashboard principal ja foram corrigidos
- `NotificationBell` continua placeholder operacional, mas sem dados fake ativos

## O que pode ser removido com seguranca apos validacao
- dependencias comprovadamente sem uso
- mocks que nao serao promovidos para integracao real

## O que precisa validacao antes de remover
- pagina antiga `/site`
- scripts operacionais de reset
- assets ou fluxos manuais usados fora da navegacao principal
- qualquer fallback que hoje esteja mascarando quebra funcional

## Recomendacao
Executar a limpeza em etapa dedicada, depois da estabilizacao de contratos, seguranca e metricas. No estado atual, parte do codigo "quebrado" ainda funciona como fallback informal. Remover cedo demais aumenta o risco de perder trilhas uteis para migracao e comparacao.
