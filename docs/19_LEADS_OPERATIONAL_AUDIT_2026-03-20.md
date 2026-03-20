# 19 Leads Operational Audit 2026-03-20

## Entradas reais de lead
- Landing publica: `apps/landing/src/components/LeadFormSection.tsx` -> `POST /api/v1/leads`
- CRM manual: `POST /api/v1/leads/manual`
- Atualizacao operacional: `PATCH /api/v1/leads/:id`
- Exportacao operacional: `GET /api/v1/leads/export`
- Detalhe rastreavel: `GET /api/v1/leads/:id`

## Persistencia real
- Fonte principal: tabela `leads`
- Consentimento: tabela `consent_logs`
- Trilha pre e pos-captura: tabela `sessions` + `analytics_events`
- Agenda vinculada: tabela `appointments`

## Campos efetivamente usados
- `Lead`: `id`, `name`, `email`, `phone`, `source`, `utmSource`, `utmMedium`, `utmCampaign`, `status`, `notes`, `consentedAt`, `createdAt`, `convertedAt`
- `ConsentLog`: `email`, `policyVersion`, `consentText`, `consentedAt`, `channel`, `ipAddress`
- `Session`: `leadId`, `referrer`, `pagesVisited`, `createdAt`

## Fonte de verdade por area
- Landing: formulario multistep envia o lead comercial e separa analytics de navegacao
- CRM Leads: tabela e export usam `GET /api/v1/leads`; cards e contadores usam `GET /api/v1/leads/stats`
- Dashboard: consolidado canonico em `apps/api/src/domain/metrics/service.ts` e `GET /api/v1/metrics/overview`
- Agenda: vincula `appointments.leadId` ao mesmo registro de `leads`
- Financeiro: usa `metrics/overview` e `financials/summary`; taxa de conversao e ticket medio dependem da mesma base de leads convertidos

## Correcoes desta etapa
- captura publica agora vincula `sessionId`, `capturePage` e `referrer` ao lead quando disponiveis
- CRM ganhou criacao manual de lead com permissao explicita `leads.create`
- CRM passou a listar, exportar e resumir com os mesmos filtros operacionais
- cards da pagina de leads deixaram de usar a pagina atual como pseudo-fonte de verdade
- detalhe expansivel mostra consentimento, sessao, agenda e timeline do lead
- edicao manual de consentimento agora registra `consent_logs` com `channel=crm_update`

## Como testar localmente
1. abrir landing e iniciar o formulario
2. concluir o envio e confirmar `201` em `POST /api/v1/leads`
3. consultar o lead em `GET /api/v1/leads?search=<email>`
4. abrir o detalhe no CRM e validar `sessions`, `consentLogs` e `timeline`
5. criar um lead manual no CRM e validar `utmSource=manual_crm`
6. alterar status/origem/observacao e validar persistencia em `PATCH /api/v1/leads/:id`
7. aplicar filtros por status, origem, consentimento e periodo; validar que tabela e export retornam a mesma base

## Gaps conhecidos
- nao existe estado materializado para `draft/incomplete`, abandono ou `opt-out`; hoje isso so pode ser inferido por analytics de sessao
- `sourceDetail` continua mapeado em `utmSource` por compatibilidade; nao foi criada migration nova nesta etapa
- first-touch e last-touch nao sao campos dedicados no banco legado; o que existe hoje e `sessions.referrer`, `pagesVisited` e UTMs
