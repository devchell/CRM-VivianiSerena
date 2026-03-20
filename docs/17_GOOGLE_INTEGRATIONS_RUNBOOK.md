# 17 Google Integrations Runbook

## Escopo
Este runbook cobre apenas o que depende da API para Google Calendar e Google Business Profile.

## Credenciais e variaveis
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- opcional: `GOOGLE_CALENDAR_ID`

## Callback e escopos
- callback esperado: `<API_BASE_URL>/api/v1/auth/google/callback`
- escopos exigidos pelo codigo:
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/business.manage`

## Estado seguro sem configuracao
- `GET /api/v1/auth/google/status` retorna `configured=false` e lista `missingConfiguration`
- `GET /api/v1/auth/google` retorna `400`
- `GET /api/v1/appointments/availability` retorna lista vazia
- `GET /api/v1/admin/google-business/locations` retorna `400`
- `POST /api/v1/admin/google-business/reviews` retorna `400`
- `GET /api/v1/content/site-summary` continua `200`, com `reviewCount=0`

## Estado seguro sem conexao OAuth
- `GET /api/v1/auth/google/status` retorna `configured=true` e `connected=false`
- `GET /api/v1/auth/google` retorna `authUrl`
- `GET /api/v1/appointments/availability` continua vazio
- `GET /api/v1/admin/google-business/locations` retorna `409`
- `POST /api/v1/admin/google-business/reviews` retorna `409`

## Sequencia de conexao
1. Cadastrar o OAuth client no Google Cloud.
2. Adicionar o callback `<API_BASE_URL>/api/v1/auth/google/callback`.
3. Configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` na API.
4. Fazer login como admin no CRM.
5. Chamar `GET /api/v1/auth/google` ou conectar pelo painel administrativo.
6. Autorizar a conta Google.
7. Confirmar callback redirecionando para `/administracao?google=connected`.
8. Validar `GET /api/v1/auth/google/status` com `connected=true` e `hasRefreshToken=true`.

## Validacao do Google Calendar
1. Confirmar `GET /api/v1/auth/google/status`.
2. Criar um agendamento temporario em `POST /api/v1/appointments`.
3. Confirmar `googleEventId != null`.
4. Atualizar o agendamento em `PATCH /api/v1/appointments/:id`.
5. Remover o agendamento em `DELETE /api/v1/appointments/:id`.

## Validacao do Google Business
1. Reutilizar a mesma conexao OAuth Google.
2. Confirmar `GET /api/v1/admin/google-business/locations` com lista de localizacoes.
3. Vincular localizacoes no CRM em `editar-site`, campo `testimonials.google_business_locations`.
4. Chamar `POST /api/v1/admin/google-business/reviews` com as localizacoes vinculadas.
5. Confirmar `GET /api/v1/content/site-summary` com `reviewCount > 0`.

## O que ainda depende de operador humano
- criar o OAuth client no Google Cloud
- cadastrar o callback correto por ambiente
- autorizar a conta Google real
- vincular as localizacoes reais da empresa no CRM
