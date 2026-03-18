# 04 Single Source Of Truth Plan

## Objetivo
Este documento reanalisa a divergencia entre paineis, modulos, dashboards, relatorios, widgets, cards, tabelas e demais superficies que exibem metricas. O foco aqui nao e so `dashboard x financeiro x leads`, mas todo ponto do produto que apresenta numeros operacionais, comerciais, financeiros ou de seguranca.

## Inventario das superficies que exibem metricas

### 1. Dashboard principal do CRM
- `apps/crm/src/app/(dashboard)/dashboard/page.tsx`
- `apps/api/src/routes/dashboard.ts`
- `apps/crm/src/components/dashboard/KPIGrid.tsx`
- `apps/crm/src/components/dashboard/RevenueChart.tsx`
- `apps/crm/src/components/dashboard/LeadsFunnel.tsx`
- `apps/crm/src/components/dashboard/RecentActivity.tsx`

### 2. Modulo de leads
- `apps/crm/src/app/(dashboard)/leads/page.tsx`
- `apps/api/src/routes/leads.ts`
- cards de totais, tabela, exportacao e filtros locais

### 3. Modulo financeiro
- `apps/crm/src/app/(dashboard)/financeiro/page.tsx`
- `apps/api/src/routes/financials.ts`
- cards de resumo, graficos mensais, distribuicao por categoria e tabela de lancamentos

### 4. Modulo de analytics
- `apps/crm/src/app/(dashboard)/analytics/page.tsx`
- `apps/api/src/routes/analytics.ts`
- metricas de trafego, sessoes, pageviews, dispositivos, origens e conversoes

### 5. Modulo de seguranca
- `apps/crm/src/app/(dashboard)/seguranca/page.tsx`
- `apps/api/src/routes/security.ts`
- cards de score, checklist e atividade de autenticacao

### 6. Outras superficies com impacto indireto
- `apps/crm/src/components/layout/NotificationBell.tsx`
- `apps/crm/src/app/api/notifications/route.ts`
- `apps/crm/src/app/(dashboard)/agenda/page.tsx`
- `apps/api/src/routes/appointments.ts`

Essas telas nao sao sempre "metricas oficiais", mas influenciam a percepcao operacional do usuario. Se exibirem mocks, dados sinteticos ou estados inconsistentes, contaminam a leitura do negocio.

## Analise detalhada das divergencias

### A. Dashboard principal

#### Divergencia 1: o total de leads do dashboard nao bate com o modulo de leads
- `apps/api/src/routes/dashboard.ts` usa `prisma.lead.count()` para o total bruto.
- `apps/api/src/routes/leads.ts` exclui registros com `email` terminado em `@tracking.internal`.
- `apps/api/src/routes/analytics.ts` cria leads sinteticos para sessoes anonimas.

Impacto:
- card de total de leads no dashboard pode ser maior que o total exibido em leads, exportacoes e funil comercial.

#### Divergencia 2: o dashboard mistura dados reais com fallback aleatorio
- `apps/crm/src/components/dashboard/RevenueChart.tsx` gera serie com `Math.random()` quando nao recebe dados.
- `apps/crm/src/components/dashboard/LeadsFunnel.tsx` gera contagens de funil com `Math.random()`.
- `apps/crm/src/components/dashboard/RecentActivity.tsx` usa atividades estaticas.

Impacto:
- graficos, widgets e cards podem parecer validos visualmente mesmo quando a API esta vazia, fora do ar ou entregando contrato incompleto.

#### Divergencia 3: cache do dashboard nao acompanha as mutacoes
- `dashboard:stats` e armazenado em cache em `apps/api/src/routes/dashboard.ts`.
- Mutacoes em leads, agendamentos e financeiro nao invalidam esse cache de forma sistematica.

Impacto:
- cards do dashboard podem mostrar numeros antigos enquanto tabelas de outros modulos mostram dados mais novos.

### B. Modulo de leads

#### Divergencia 4: a landing principal nao envia o mesmo conceito de lead que a API exige
- `apps/landing/src/components/LeadFormSection.tsx` envia `name`, `phone`, `source`, `utm*` e `notes`, mas nao envia `email`.
- `apps/api/src/routes/leads.ts` exige `email`.
- `apps/landing/src/lib/analytics.ts` ainda chama `trackLead()`, que tenta registrar lead por outro fluxo.

Impacto:
- a mesma interacao pode falhar como lead comercial, ser registrada parcialmente como tracking ou gerar duplicidade sem consistencia.

#### Divergencia 5: modulo de leads aplica filtros proprios que nao sao compartilhados por outras superficies
- Exclusao de tracking sintetico ocorre em leads, mas nao em todos os paineis.
- Seeds, testes internos e trafego tecnico nao parecem ter um marcador central para exclusao.

Impacto:
- cards, tabela, exportacao e dashboard podem usar universos de dados diferentes.

### C. Modulo financeiro

#### Divergencia 6: o financeiro calcula KPIs comerciais com base contabil sem vinculo transacional
- `apps/api/src/routes/financials.ts` calcula `ticketMedio` a partir de receita manual do mes dividida por leads convertidos.
- Lancamentos financeiros nao possuem relacao formal com `Lead`, `Appointment` ou `Opportunity`.

Impacto:
- receita, ticket medio, conversao e rentabilidade nao sao auditaveis ponta a ponta.
- qualquer lancamento manual altera KPI comercial sem evento comercial correspondente.

#### Divergencia 7: CRM e API nao compartilham o mesmo vocabulario de categorias e respostas
- `apps/crm/src/app/(dashboard)/financeiro/page.tsx` usa categorias como `sessao_individual`, `office_mooca`, `office_tatuape`.
- `apps/api/prisma/schema.prisma` define enum diferente para `FinancialCategory`.
- O front espera alguns campos de resumo/grafico com nomes diferentes dos campos reais retornados pela API.

Impacto:
- cards, tabelas e graficos financeiros podem quebrar, omitir categorias ou mapear informacao errada.

### D. Modulo de analytics

#### Divergencia 8: analytics mistura eventos de trafego com entidades de CRM
- `apps/api/src/routes/analytics.ts` transforma sessao anonima em lead sintetico.
- Sessao, pageview e lead comercial deixam de ser dominios separados.

Impacto:
- o modulo de analytics contamina o dominio comercial.
- o dashboard herda esse ruido quando usa a tabela `Lead` como base.

### E. Modulo de seguranca

#### Divergencia 9: alguns indicadores de seguranca sao parcialmente sinteticos
- `apps/api/src/routes/security.ts` combina alguns dados reais com checklist e bases simuladas.

Impacto:
- cards e widgets de seguranca aparentam ser metricas operacionais consolidadas, mas nao sao integralmente auditaveis.

### F. Agenda e superficies relacionadas

#### Divergencia 10: agenda opera com contrato diferente do backend
- `apps/crm/src/app/(dashboard)/agenda/page.tsx` envia `clientName`, `clientEmail`, `clientPhone`, `startTime`, `endTime`, `notes`.
- `apps/api/src/routes/appointments.ts` espera `leadId`, `date`, `serviceType`, `duration`.

Impacto:
- agendamentos podem nao ser persistidos corretamente.
- metricas de appointments, conversao e receita potencial ficam estruturalmente comprometidas.

## Hipotese tecnica das causas
As divergencias nao nascem de um unico bug. A causa principal e a ausencia de uma camada central de metricas e de contratos canonicos entre dominios.

### Causas provaveis
- Cada rota calcula agregados localmente com filtros proprios.
- A UI preenche lacunas com mocks, fallbacks aleatorios ou adaptacoes locais.
- Analytics escreve dentro do dominio comercial em vez de manter trilha separada.
- Financeiro tenta derivar KPIs de negocio sem vinculacao transacional.
- Nao existe catalogo formal de definicoes de KPI.
- Nao existe contrato tipado compartilhado entre API e CRM para todos os agregados.
- Invalidaao de cache e parcial e orientada a endpoint, nao a dominio.

## Proposta de fonte unica da verdade por dominio

### 1. Dominio comercial
Fonte de verdade:
- `Lead`
- `LeadStatusHistory` ou `LeadEvent` dedicado
- `Appointment`

Regras:
- `Lead` representa apenas interesse comercial valido.
- Trafego anonimo, pageview e sessao nunca criam `Lead` automaticamente.
- Conversao deve ser um evento de dominio auditavel, nao inferencia dispersa.

### 2. Dominio financeiro
Fonte de verdade:
- `FinancialTransaction`
- referencia opcional obrigatoria por caso de uso para `leadId`, `appointmentId`, `orderId` ou `revenueSource`

Regras:
- KPI contabil nasce do financeiro.
- KPI comercial-financeiro so pode ser exibido com regra de atribuicao formal.
- `ticketMedio` oficial deve vir de receita reconhecida vinculada a conversoes validas, ou ser marcado explicitamente como "estimado".

### 3. Dominio de analytics
Fonte de verdade:
- `Session`
- `PageView`
- `Event`
- `UTMAttribution`

Regras:
- Analytics mede aquisicao e comportamento.
- Analytics nao injeta linhas sinteticas em tabelas de CRM.
- Conversao de marketing deve apontar para `leadId` real quando existir, sem reescrever o dominio comercial.

### 4. Dominio de seguranca
Fonte de verdade:
- `AuthAuditLog`
- `SecurityEvent`
- `UserSession`

Regras:
- Scores, cards e checklists devem ser derivados desses eventos ou marcados como "manual/configuracional".
- Nada de base aleatoria para card operacional.

## Proposta de centralizacao das regras de calculo

### Camada recomendada
Criar uma camada unica no backend, por exemplo:
- `MetricsDefinitionRegistry`
- `MetricsService`
- `MetricsQueryRepository`
- `MetricsCacheInvalidation`

### Responsabilidades
- Definir o universo valido de dados por dominio.
- Aplicar filtros oficiais de periodo, timezone e exclusoes tecnicas.
- Calcular KPIs, totais, agregados e series temporais.
- Expor contratos versionados para CRM e landing administrativa.
- Invalidar cache por evento de dominio, nao por tela.

### Regra de ouro
UI nao calcula KPI oficial. UI apenas consome:
- valor
- periodo
- filtros aplicados
- versao da definicao
- grau de confianca

## Contrato de dados para KPIs, totais, agregados e indicadores

### Envelope canonico
```json
{
  "metricSet": "crm.overview",
  "definitionVersion": "2026-03-18.1",
  "domain": "commercial",
  "period": {
    "from": "2026-03-01T00:00:00-03:00",
    "to": "2026-03-31T23:59:59-03:00",
    "timezone": "America/Sao_Paulo",
    "granularity": "day"
  },
  "filters": {
    "source": ["meta_ads", "organic", "direct"],
    "unit": [],
    "ownerId": null,
    "excludeSynthetic": true,
    "excludeSeedData": true
  },
  "quality": {
    "isOfficial": true,
    "isEstimated": false,
    "attributionModel": "last_valid_touch",
    "warnings": []
  },
  "metrics": {}
}
```

### Contrato minimo para overview comercial
```json
{
  "metrics": {
    "leadsCreated": 0,
    "leadsQualified": 0,
    "leadsConverted": 0,
    "conversionRate": 0,
    "appointmentsScheduled": 0,
    "appointmentsCompleted": 0,
    "pipelineValue": 0
  }
}
```

### Contrato minimo para overview financeiro
```json
{
  "metrics": {
    "recognizedRevenue": 0,
    "cashIn": 0,
    "expenses": 0,
    "netResult": 0,
    "averageTicketOfficial": 0,
    "averageTicketEstimated": 0
  }
}
```

### Contrato minimo para funil
```json
{
  "metrics": {
    "visitors": 0,
    "sessions": 0,
    "leadsValid": 0,
    "appointmentsScheduled": 0,
    "salesClosed": 0
  }
}
```

### Regras de nomenclatura
- O mesmo KPI nunca muda de nome entre endpoints.
- Campos de serie temporal usam sempre `date` ou `bucketStart`.
- Campos monetarios usam sempre a mesma moeda e unidade.
- Todo percentual deve informar se ja vem em `0..1` ou `0..100`.

## Estrategia para impedir divergencias futuras

### 1. Catalogo de definicoes
Criar um catalogo versionado de KPIs com:
- nome canonico
- descricao
- formula
- dominio
- fonte primaria
- exclusoes
- timezone
- responsavel tecnico

### 2. Contrato compartilhado entre API e CRM
- Consolidar schemas em pacote comum ou OpenAPI gerado.
- Validar respostas com Zod/TypeScript nos dois lados.
- Bloquear uso de campos nao documentados.

### 3. Separacao fisica entre dominio operacional e analytics
- Remover criacao de lead sintetico para tracking.
- Criar tabela/evento proprio para conversao anonima ate existir `leadId` real.

### 4. Cache por evento de dominio
- Mudou `Lead`: invalida metricas comerciais relacionadas.
- Mudou `Appointment`: invalida funil e agenda operacional.
- Mudou `FinancialTransaction`: invalida metricas financeiras e atribuidas.
- Nada de cache sobreviver sem chave de periodo e versao de definicao.

### 5. Testes de consistencia cruzada
- Testar que dashboard, cards de leads, relatorios e financeiro retornam os mesmos totais quando compartilham filtro e periodo.
- Testar fixtures com seeds conhecidas e resultados esperados.
- Testar round-trip de conversao: trafego -> lead -> appointment -> receita.

### 6. Politica de UI
- Proibir `Math.random()` e mocks silenciosos em superficie operacional.
- Se nao houver dado oficial, exibir estado vazio ou "dados indisponiveis".
- Marcar claramente quando um numero for estimado ou parcial.

## Plano objetivo de implementacao futura

### Etapa 1
- Inventariar todos os KPIs oficiais e seus consumidores.
- Classificar cada metrica como `official`, `estimated`, `mock`, `legacy` ou `broken`.

### Etapa 2
- Extrair calculos para a camada central de metricas no backend.
- Padronizar contratos e tipos compartilhados.

### Etapa 3
- Corrigir dominios contaminados: tracking separado de lead; financeiro ligado a referencia de negocio.

### Etapa 4
- Substituir superficies da UI para consumir apenas endpoints canonicos.

### Etapa 5
- Adicionar testes de consistencia, observabilidade e alarmes para divergencia.

## Resultado esperado
Quando esse plano for executado:
- cards, widgets, tabelas, dashboards e relatorios passarao a ler os mesmos agregados oficiais;
- diferencas entre telas so ocorrerao por filtro, granularidade ou recorte explicitamente declarado;
- cada KPI tera formula auditavel, contrato tipado e origem rastreavel;
- a operacao deixara de depender de heuristica local, mocks ou dados sinteticos misturados ao CRM.
## Update apos execucao da refatoracao

- Implementada a camada canonica em `apps/api/src/domain/metrics/service.ts`.
- Criado `GET /api/v1/metrics/overview` como contrato agregado para dashboard e superficies operacionais.
- Dashboard e financeiro do CRM foram ajustados para consumir a mesma origem de dados.
- Landing deixou de persistir lead pelo modulo de analytics; agora existe apenas um POST canonico para a API.
- Agenda do CRM foi alinhada ao contrato real de `appointments`, eliminando criacao local com payload divergente.
