# 12 Operations And Monitoring

## Operacao diaria
- acompanhar builds da CI;
- acompanhar deploys de homologacao;
- revisar contas inativas com convite pendente;
- revisar eventos de seguranca;
- validar saude da API e integracoes.

## Monitoramento minimo
- endpoint de health da API;
- logs da API;
- falhas de SMTP;
- falhas de Redis;
- falhas de 2FA por e-mail ou SMS.

## Indicadores operacionais recomendados
- quantidade de contas inativas;
- falha de envio de convite;
- falha de OTP;
- tempo medio de resposta da API;
- erros 5xx por rota.

## Rotina de suporte
- se o colaborador nao recebeu convite:
  - localizar na aba `Inativos`;
  - revisar nome, e-mail e telefone;
  - reenviar e-mail.
- se o colaborador ja acessou:
  - tratar como conta `Ativa`;
  - usar edicao normal de perfil.
