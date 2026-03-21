# 16 Audit Status 2026-03-20

## Data de referencia
- Auditoria factual em `2026-03-20`.
- Codigo auditado: branch `staging`.
- Homologacao consultada:
  - `landing-hml -> https://landing-hml.vercel.app`
  - `crm-hml -> https://crm-hml.vercel.app`
  - `api-hml -> https://api-hml-sbk3.onrender.com`

## Validacao remota comprovada
- `GET /health/live` -> `200`
- `GET /health/ready` -> `200`
- `GET /health/deps` -> `200`
- login admin em homologacao -> `200`
- `GET /api/v1/admin/overview` -> banco `true`, redis `true`, uploads `true`, Google OAuth `configured=false`, `connected=false`
- `GET /api/v1/content/site-summary` -> `200`

## Fluxos auditados

### Leads
- Entrada real confirmada: `apps/landing/src/components/LeadFormSection.tsx` envia `POST /api/v1/leads`.
- Tracking da landing nao cria lead; apenas analytics.
- Persistencia real: tabela `leads`.
- CRM consome: `GET /api/v1/leads`, `PATCH /api/v1/leads/:id`, `GET /api/v1/leads/export`.
- Teste ponta a ponta em homologacao:
  1. criar lead publico em `POST /api/v1/leads`
  2. confirmar leitura em `GET /api/v1/leads?search=<email>`
  3. exportar LGPD em `GET /api/v1/privacy/export?email=<email>`
  4. confirmar reflexo em `GET /api/v1/content/site-summary`
  5. limpar com `DELETE /api/v1/leads/:id`
- Evidencia remota em `2026-03-20`: lead temporario criado, lido no CRM/API e removido com sucesso.
- Estado atual do codigo:
  - `POST /api/v1/leads` grava `lead.consentedAt`
  - `POST /api/v1/leads` grava `consent_logs` com IP anonimizado e `channel=landing_form`
  - `GET /api/v1/privacy/export` exporta `consentedAt` e historico de `consent_logs`
- Correcao estrutural aplicada nesta auditoria:
  - rotas de LGPD usavam `req.user.id`, mas o auth real expunha `req.user.sub`; isso impedia auditoria de exportacao/anonimizacao

### Agenda / Google Calendar
- Implementacao real confirmada:
  - OAuth: `apps/api/src/routes/auth.ts`
  - servico Google: `apps/api/src/infrastructure/googleCalendar.ts`
  - uso em appointments: `apps/api/src/routes/appointments.ts`
- CRUD de evento Google existe, com token em Redis e refresh token.
- Homologacao em `2026-03-20`: Google nao configurado e nao conectado.
- Comportamento real atual:
  - criacao de agendamento continua funcionando sem Google
  - `googleEventId` fica `null` quando a integracao nao esta conectada
- Ajuste local aplicado nesta auditoria:
  - `getAvailableSlots()` nao devolve mais agenda artificialmente livre quando o Google nao esta conectado
- Evidencia remota em `2026-03-20`: agendamento temporario criado com sucesso e `googleEventId=null`; depois removido.

### Google Business Profile / Reviews
- Implementacao real confirmada:
  - busca de localizacoes: `GET /api/v1/admin/google-business/locations`
  - busca de reviews: `POST /api/v1/admin/google-business/reviews`
  - consumo publico: `GET /api/v1/content/site-summary`
  - configuracao no CRM: `apps/crm/src/app/(dashboard)/editar-site/page.tsx`
- A integracao reutiliza o OAuth Google do backend e depende de localizacoes vinculadas no CMS.
- Homologacao em `2026-03-20`:
  - `googleEnabled=true`
  - `linkedLocations=0`
  - `reviewCount=0`
  - OAuth Google ausente no `admin/overview`
- Comportamento endurecido no codigo:
  - `GET /api/v1/admin/google-business/locations` responde `400` se o OAuth Google nao estiver configurado
  - `GET /api/v1/admin/google-business/locations` responde `409` se o OAuth Google nao estiver conectado
- Conclusao factual: estrutura implementada, mas fluxo nao esta operacional em homologacao no estado atual por falta de configuracao/vinculo.

### Dashboard / Leads / Financeiro / Agenda
- Dashboard e cards principais usam `GET /api/v1/metrics/overview`.
- Financeiro usa:
  - `GET /api/v1/financials`
  - `GET /api/v1/financials/summary`
  - `GET /api/v1/financials/charts`
- Agenda usa `GET /api/v1/appointments`.
- Regras de agregacao confirmadas:
  - financeiro mensal considera `date >= inicio do mes` e `date <= now`
  - agendamentos futuros contam em `appointments.upcoming`
  - leads do dashboard usam a camada consolidada em `apps/api/src/domain/metrics/service.ts`
- Evidencia remota em `2026-03-20`:
  - lancamento financeiro com horario passado atualizou `financials/summary` e `metrics/overview`
  - lancamento com horario futuro no mesmo dia nao entra no consolidado ate o horario chegar

### Seguranca
- API e CRM usam permissao backend real, nao apenas menu.
- Rotas confirmadas:
  - `security/events`
  - `security/stats`
  - `security/activity`
  - `security/checklist`
  - `security/block-ip`
- Eventos sensiveis vao para `security_events`.

### Colaboradores
- Fonte real: `apps/api/src/routes/users.ts`.
- Perfis vigentes:
  - `ADMIN`
  - `COLLABORATOR` persistido como `MANAGER`
  - `VIEWER`
- Status operacional:
  - `INACTIVE` -> `lastLogin = null`
  - `ACTIVE` -> `lastLogin != null`
- Convite e reenvio dependem de SMTP configurado.

### Administracao
- Fonte real: `apps/api/src/routes/admin.ts`.
- Painel expoe:
  - estado de Google Calendar
  - estado de SMTP
  - checks de banco, Redis e uploads
  - URLs e CORS do ambiente

### Settings
- Fonte real: `apps/api/src/routes/auth.ts`.
- Fluxos auditados:
  - atualizar perfil
  - trocar senha
  - configurar 2FA por e-mail, SMS ou ambos

## Ajustes locais desta auditoria
- `package.json`
  - engine de Node normalizado para `>=20.20.1 <21`
- `.nvmrc`
  - Node fixado em `20.20.1`
- `.node-version`
  - Node fixado em `20.20.1`
- `.github/workflows/ci.yml`
  - CI alinhada para `Node 20.20.1`
- `.github/workflows/deploy-homolog.yml`
  - deploy de homologacao alinhado para `Node 20.20.1`
- `apps/api/src/routes/leads.ts`
  - captura publica passa a registrar consentimento LGPD
- `apps/api/src/routes/privacy.ts`
  - exportacao LGPD inclui `consent_logs` e `consentedAt`
- `apps/api/src/routes/admin.ts`
  - Google Business falha com mensagens explicitas quando OAuth nao esta pronto
- `apps/api/src/infrastructure/googleCalendar.ts`
  - disponibilidade deixa de simular agenda livre sem OAuth conectado
- `packages/utils/package.json`
  - ordem de `exports` corrigida para remover warning de build
- `packages/ui/package.json`
  - ordem de `exports` corrigida para remover warning de build
- `render.yaml`
  - `API_BASE_URL` adicionado
  - `corepack enable` alinhado ao runbook

## Gaps reais restantes
- Google Calendar nao esta configurado na homologacao auditada.
- Google Business/Profile nao esta operacional na homologacao auditada.
- API continua sem pipeline versionado de deploy equivalente ao workflow de Vercel.
