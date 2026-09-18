# Integração TyviaTalk — preparação

Status: preparada para contrato, ainda não habilitada.

O fluxo implementado hoje usa a Meta WhatsApp Business Platform diretamente. Não há adapter, endpoint, payload ou assinatura TyviaTalk no repositório. A TyviaTalk publica que possui documentação de API, mas os dados necessários para uma integração segura ainda não foram fornecidos.

## O que já foi organizado

- O Compose encaminha as configurações atuais da Meta para a API.
- Placeholders TyviaTalk foram adicionados aos exemplos de ambiente e permanecem vazios.
- O envio continua bloqueado por `WHATSAPP_DISPATCH_ENABLED=false` até a configuração real.
- Nenhuma credencial, domínio ou e-mail foi inventado ou gravado no código.
- Os testes E2E locais não apontam mais por padrão para o IP público; use `E2E_LANDING_URL` e `E2E_CRM_URL` explicitamente para testar um ambiente remoto.

## Dados que faltam antes do código TyviaTalk

1. URL base e documentação/OpenAPI da API.
2. Tipo de autenticação, escopo e forma de rotação do token.
3. Endpoint, payload e resposta do envio; especialmente o ID da mensagem.
4. URL/rota do webhook, cabeçalho ou esquema de assinatura e janela contra replay.
5. Eventos disponíveis e mapeamento para `sent`, `delivered`, `read` e `failed`.
6. Identificador da conta/instância e limites, retries, templates e opt-out.
7. Domínio HTTPS final da API para o callback público.
8. E-mail autorizado para SMTP, alertas e operação; a senha deve permanecer somente no ambiente/VPS.

## Rota proposta

Depois de receber o contrato, a rota pode ser separada da Meta em:

`POST /api/v1/whatsapp/tyviatalk/webhook`

Ela só deve ser publicada quando houver validação server-side do payload, assinatura/replay, limite específico, normalização de eventos e testes de contrato. O endpoint não deve aceitar ou registrar eventos como entrega real enquanto o provider estiver apenas simulado.

## Sequência de implementação

1. Confirmar o contrato TyviaTalk e decidir se ele substitui ou coexiste com Meta.
2. Extrair uma interface pequena de provider para envio, status e receipts.
3. Implementar adapter TyviaTalk com timeout, tratamento de 429/5xx e idempotência.
4. Persistir/deduplicar receipts e testar replay, concorrência e falha parcial.
5. Integrar o editor de WhatsApp no CRM; hoje o fluxo visual força `whatsappEnabled=false`.
6. Configurar domínio, e-mail e segredos somente na VPS, validar em homologação e então promover com aceite.

Até os itens 1–6 existirem, o estado correto é “integração TyviaTalk pendente”, nunca “WhatsApp enviado”.
