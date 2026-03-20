# Disparos CRM

Modulo operacional em `CRM > Leads > Disparos`, usando a mesma base canonica de `GET /api/v1/leads`.

## O que existe

- segmentacao por `status`, `source`, periodo, atividade, consentimento e elegibilidade por canal
- rascunho por status em `DispatchDraft` via `audit_logs`
- limites operacionais em `DispatchSettings` via `audit_logs`
- historico de campanhas em `DispatchCampaign`
- historico por destinatario em `DispatchRecipient`
- exportacao CSV da audiencia filtrada

## Elegibilidade

Email:
- `eligible`
- `missing_email`
- `invalid_email`
- `missing_consent`
- `opt_out`
- `previous_bounce`
- `daily_limit`
- `provider_failed`
- `provider_unconfigured`

WhatsApp:
- `eligible`
- `missing_number`
- `invalid_number`
- `missing_consent`
- `opt_out`
- `daily_limit`
- `provider_failed`
- `provider_unconfigured`

## Limites e protecoes

- limite diario configuravel por canal
- `batchSize` por disparo
- `pacingMs` entre tentativas
- idempotencia por `idempotencyKey`
- bloqueio explicito quando nenhum canal esta habilitado
- logs com `userId`, `ip`, horario e contadores

## Dependencias externas

Email:
- SMTP ativo em `Configuracoes > Email`

WhatsApp:
- provider oficial ainda nao integrado neste fluxo
- o modulo nao simula envio
- quando nao configurado, registra `provider_unconfigured`

## Teste rapido

1. Abrir `CRM > Leads > Disparos`.
2. Selecionar um status e revisar a audiencia.
3. Salvar rascunho.
4. Ajustar limites operacionais.
5. Confirmar o modal de disparo.
6. Validar `Historico e relatorios`.
7. Conferir `DispatchCampaign` e `DispatchRecipient` em `audit_logs`.
