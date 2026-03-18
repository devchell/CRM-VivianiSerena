# 06 Refactor Plan

## Objetivo
Sair do estado atual para uma arquitetura confiavel, observavel e pronta para producao 24/7, sem refatoracao destrutiva prematura e sem perder regras de negocio validas ja existentes.

## Ordem recomendada

### Etapa 0: congelamento e baseline
- congelar schema e fluxos criticos atuais
- tirar backup de banco e uploads
- registrar status de build atual
- documentar contratos quebrados antes de alterar

### Etapa 1: seguranca e ambiente
- rotacionar segredos
- limpar `.env` e separar por ambiente
- remover exposicao de segredo no cliente
- corrigir autorizacao real no backend

### Etapa 2: estabilizacao de contratos
- definir DTOs e schemas canonicos para:
  - auth
  - leads
  - appointments
  - financials
  - content
  - metrics
- fazer CRM e landing consumirem apenas esses contratos
- remover chamadas para endpoints inexistentes

### Etapa 3: fonte unica da verdade e fluxo comercial
- separar analytics de leads reais
- remover leads sinteticos do dominio comercial
- criar camada unica de calculo de KPI
- padronizar periodos, filtros e exclusoes
- revisar invalidacao de cache por evento de dominio

### Etapa 4: infraestrutura de producao
- migrar uploads para storage gerenciado
- separar API web, jobs e realtime conforme necessidade
- provisionar banco e Redis gerenciados
- implementar observabilidade e alertas reais

### Etapa 5: limpeza de legado
- remover telas duplicadas, mocks e rotas orfas
- remover dependencias sem uso confirmado
- consolidar editor de conteudo em uma unica experiencia

## O que refatorar primeiro
1. Seguranca de segredos e RBAC.
2. Captura de lead da landing.
3. Contrato de agenda.
4. Contrato de financeiro.
5. Endpoints canonicos de metricas.

## O que reescrever
- camada de metricas e definicoes de KPI
- agenda do CRM
- partes do modulo financeiro do CRM
- fluxo de captura de lead da landing
- bootstrap de ambiente e governanca de segredo

## O que preservar
- monorepo com separacao entre landing, CRM e API
- Prisma como ORM
- entidades centrais de negocio
- Redis como suporte a tokens e cache
- integracoes com Google Calendar e SMTP, desde que revisadas

## Dependencias entre etapas
- seguranca vem antes de deploy
- contratos vem antes de teste de regressao confiavel
- fonte unica da verdade vem antes de ajuste visual de dashboard
- storage gerenciado vem antes de escalar horizontalmente a API

## Riscos por etapa

### Etapa 1
- rotacao de segredos exige coordenacao com qualquer ambiente ja ativo

### Etapa 2
- alinhamento de contrato pode quebrar telas que hoje funcionam de forma acidental

### Etapa 3
- mudanca de definicao de KPI altera numeros visiveis; precisa comunicacao e validacao paralela

### Etapa 4
- migracao de uploads e banco exige janela de corte e rollback claro

### Etapa 5
- remocao de legado deve ser guiada por evidencia de uso

## Estrategia de rollback
- banco:
  - backup antes de cada etapa com migracao
  - restore testado
- aplicacao:
  - deploy por versao imutavel
  - rollback para release anterior
- metricas:
  - comparacao paralela entre KPI legado e KPI canonico por periodo controlado
- uploads:
  - sincronizacao temporaria ou freeze curto antes do corte final

## Criterio de saida
- `landing`, `crm` e `api` passam build
- smoke tests criticos passam
- dashboard, leads, financeiro e analytics usam contratos alinhados
- KPIs oficiais saem de camada unica no backend
- RBAC administrativo esta aplicado no backend
- deploy pode ocorrer sem filesystem local como dependencia critica
