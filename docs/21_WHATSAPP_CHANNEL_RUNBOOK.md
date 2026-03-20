# WhatsApp Business Channel

Canal oficial implementado via Meta WhatsApp Business Platform no backend/API.

## O que existe

- conexao oficial no CRM em `Administracao`
- Embedded Signup da Meta no frontend admin
- troca de `code` no backend
- persistencia cifrada do token do canal em `audit_logs` (`WhatsappChannelConfig`)
- envio oficial pelo backend em `DispatchRecipient`
- webhook publico em `GET/POST /api/v1/whatsapp/webhook`
- receipts de status em `DispatchReceipt`

## Variaveis obrigatorias

- `WHATSAPP_APP_ID`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

## Variavel opcional

- `WHATSAPP_GRAPH_API_VERSION`
  - default no codigo: `v22.0`

## Assets externos necessarios

- app Meta com acesso ao WhatsApp Business Platform
- configuracao de Embedded Signup vinculada ao app
- WABA da cliente
- numero comercial aprovado na WABA
- webhook da API cadastrado no app Meta

## Webhook

- callback esperado: `{API_BASE_URL}/api/v1/whatsapp/webhook`
- verificacao via `hub.verify_token`
- assinatura `x-hub-signature-256` validada quando o provider envia o header

## Como conectar

1. Abrir `CRM > Administracao`.
2. Ir ao bloco `WhatsApp Business`.
3. Clicar `Conectar canal oficial`.
4. Completar o Embedded Signup oficial da Meta.
5. Confirmar retorno com:
   - `displayPhoneNumber`
   - `phoneNumberId`
   - `businessAccountId`
   - `webhookSubscribed=true`

## Como testar

1. Validar `GET /api/v1/admin/whatsapp/status`.
2. Validar `GET /api/v1/dispatches/audience?status=new` e conferir `providerConfigured`.
3. Disparar campanha com WhatsApp habilitado.
4. Conferir `DispatchRecipient` com `providerMessageId`.
5. Conferir `DispatchReceipt` apos webhook de `sent`, `delivered`, `read` ou `failed`.

## Limites reais

- o envio depende das politicas da Meta e da situacao do numero/WABA
- o sistema nao faz descoberta nao oficial de "esse numero tem WhatsApp"
- quando a Meta rejeita ou o canal nao esta conectado, o CRM registra falha real
