# 03 Domain And Data Flow

## Visao geral
O sistema atual mistura pelo menos quatro dominios que deveriam estar mais separados:
- comercial
- financeiro
- analytics
- seguranca

Esses dominios se cruzam em varias telas, cards, widgets, dashboards e relatorios. O problema central nao e so "de onde vem o dado", mas "quem tem autoridade para definir o significado daquele numero".

## Entidades principais por dominio

### Dominio comercial

#### User
- Administra CRM, autenticacao e permissoes.
- Campos relevantes: `role`, `allowedModules`, `twoFactorEnabled`, `mustChangePassword`.

#### Lead
- Entidade principal de captacao e pipeline comercial.
- Campos observados com impacto metrico: `source`, `status`, `createdAt`, `convertedAt`.

#### Appointment
- Vinculado a `Lead`.
- Representa agendamento operacional e potencial gatilho de conversao.

### Dominio financeiro

#### Financial
- Lancamento manual de receita ou despesa.
- Hoje e a base de varios cards financeiros, mas sem relacao formal obrigatoria com `Lead` ou `Appointment`.

### Dominio de analytics

#### Session
- Registra navegacao, dispositivo, origem e comportamento.
- Hoje pode acabar vinculada a lead sintetico.

#### PageView / Event
- Alimentam modulo de analytics, origem de trafego e comportamento de usuario.

### Dominio de conteudo

#### Content
- Estrutura chave-valor por secao para landing page.

### Dominio de seguranca

#### SecurityEvent / AuditLog
- Eventos de autenticacao, mudancas administrativas e trilha de auditoria.

## Origem e destino dos dados por fluxo

### 1. Fluxo de conteudo
1. CRM edita conteudo.
2. API persiste em `Content`.
3. Landing consulta `GET /api/v1/content`.
4. Conteudo e renderizado na landing.

### 2. Fluxo comercial esperado
1. Visitante chega na landing.
2. Landing deveria registrar analytics em dominio proprio.
3. Quando houver intencao comercial valida, a API deveria criar `Lead`.
4. CRM lista, qualifica, converte e relaciona atendimentos.
5. Eventual receita deveria ser atribuida por relacao formal.

### 3. Fluxo comercial observado hoje
1. Landing envia formulario por `LeadFormSection`.
2. O payload nao respeita integralmente o schema exigido pela API.
3. A mesma jornada ainda aciona `trackLead()`.
4. Analytics pode criar lead sintetico para sessao anonima.
5. CRM e dashboard passam a ler um conjunto misturado de leads reais e tecnicos.

### 4. Fluxo de analytics observado hoje
1. Landing envia pageview, vitals e eventos.
2. API cria/atualiza `Session`.
3. Para sessao anonima, a API pode criar `Lead` sintetico com `@tracking.internal`.
4. Modulo de analytics consulta `Session` e tambem consulta `Lead`.

### 5. Fluxo financeiro observado hoje
1. CRM registra um lancamento manual.
2. API grava em `Financial`.
3. Cards e graficos financeiros agregam essa tabela.
4. Alguns KPIs comerciais financeiros usam `Lead` convertido como denominador, sem relacao transacional.

### 6. Fluxo de agenda observado hoje
1. CRM tenta criar agendamento com contrato proprio.
2. API espera outro contrato.
3. Se houvesse aderencia, o backend criaria `Appointment`, espelharia Google Calendar e enviaria notificacao.

## Superficies de leitura de metricas

### Dashboard principal
- Lembra um consolidado executivo, mas hoje mistura:
  - cards vindos da API
  - funil com fallback aleatorio
  - grafico com amostra sintetica
  - atividade recente estatica

### Leads
- Tabela e cards usam filtros proprios e excluem tracking sintetico.

### Financeiro
- Usa `Financial`, mas deriva indicadores comerciais e de ticket medio sem relacao formal com receita por venda.

### Analytics
- Usa `Session`, `Lead` e funil de conversao com separacao de dominio insuficiente.

### Seguranca
- Combina alguns dados reais com scores/checklists parcialmente configuracionais ou simulados.

## Onde as metricas sao calculadas hoje

### `GET /api/v1/dashboard/stats`
- Usa `Lead`, `Appointment` e `Financial`.
- Conta total de leads sem exclusao padrao de tracking sintetico.
- Resume comercial e financeiro no mesmo payload.

### `GET /api/v1/leads/stats`
- Usa `Lead`.
- Exclui `@tracking.internal`.
- Aplica logica diferente da usada no dashboard.

### `GET /api/v1/financials/summary`
- Usa `Financial` e `Lead`.
- Mistura receita manual do mes com total de leads convertidos.

### `GET /api/v1/financials/charts`
- Usa `Financial`.
- Produz serie temporal e agregados de categoria.

### `GET /api/v1/analytics/dashboard`
- Usa `Session` e `Lead`.
- Mapeia comportamento e conversao em cima de dominios ja contaminados.

### `GET /api/v1/security/*`
- Usa eventos de seguranca e tambem elementos predefinidos/checklists.

## Mapa de transformacoes e agregacoes

| Superficie | Metrica | Fonte observada | Regra observada | Risco |
| --- | --- | --- | --- | --- |
| Dashboard | total de leads | `Lead` | conta tudo | inclui tracking sintetico |
| Leads | total de leads | `Lead` | exclui `@tracking.internal` | diverge do dashboard |
| Dashboard | conversao | `Lead` | convertidos / total global | mistura universos e periodos |
| Financeiro | ticket medio | `Financial` + `Lead` | receita manual / leads convertidos | sem vinculo auditavel |
| Analytics | funil | `Session` + `Lead` | parte real, parte contaminada | conversao instavel |
| CRM Dashboard | revenue chart | fallback local | `Math.random()` sem dado | grafico engana operacao |
| CRM Dashboard | leads funnel | fallback local | `Math.random()` sem dado | funil nao oficial |
| Seguranca | score/checklist | mistura de logs e base fixa | parcialmente sintetico | score nao totalmente auditavel |

## Principais pontos de divergencia

### 1. Dominio comercial contaminado por analytics
- Sessao anonima gera lead tecnico.
- Tabela `Lead` deixa de representar apenas interesse comercial valido.

### 2. Periodos e filtros diferentes
- Dashboard usa mes atual.
- Leads usa janela configuravel.
- Analytics usa 30 dias.
- Financeiro mistura mes atual, mes anterior e categorias manuais.

### 3. UI com heuristica local
- Alguns componentes calculam, adaptam ou simulam visualmente o dado.

### 4. Cache sem desenho canonico
- Endpoints cacheiam por tela.
- Invalidacao nao acompanha evento de dominio.

### 5. Contratos quebrados
- Landing x API em `Lead`.
- Agenda x API em `Appointment`.
- Financeiro x Prisma/API em categorias e nomes de campos.

## Fonte unica da verdade recomendada por dominio

### Comercial
- `Lead`
- historico de status ou `LeadEvent`
- `Appointment`

### Financeiro
- `FinancialTransaction`
- relacao explicita com origem de receita sempre que houver KPI comercial-financeiro

### Analytics
- `Session`
- `PageView`
- `Event`
- `UTMAttribution`

### Seguranca
- `AuthAuditLog`
- `SecurityEvent`
- `UserSession`

## Regra de leitura futura
Nenhuma superficie oficial deve calcular KPI localmente. Toda leitura oficial deve vir de camada centralizada de metricas com:
- definicao de dominio
- periodo
- filtros
- versao da regra
- classificacao `official`, `estimated` ou `manual`

## Diagnostico final do fluxo critico
Hoje o sistema nao possui uma trilha confiavel e auditavel `visita -> lead valido -> agendamento -> conversao -> receita reconhecida -> KPI oficial`. As entidades ate existem, mas os contratos e as regras que ligam essas etapas nao estao centralizados. Por isso, divergencias entre modulos nao sao excecao; sao um comportamento esperado do desenho atual.
