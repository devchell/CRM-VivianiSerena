# 11 Migration Runbook

## Objetivo
Aplicar mudancas de schema e manter homologacao e producao consistentes.

## Caso atual
Existe migracao preparada para adicionar:
- `two_factor_email_enabled`
- `two_factor_sms_enabled`

Arquivo:
- `apps/api/prisma/migrations/20260319151500_two_factor_channels/migration.sql`

## Ordem recomendada
1. Fazer backup do banco.
2. Confirmar janela de manutencao.
3. Aplicar migracao no ambiente alvo.
4. Executar update de seguranca:
   - desligar `two_factor_enabled`
   - desligar `two_factor_email_enabled`
   - desligar `two_factor_sms_enabled`
   para usuarios antigos, se a migracao nao fizer isso automaticamente.
5. Regenerar client Prisma no ambiente de build.
6. Publicar a nova versao da API.
7. Validar login, `GET /auth/me` e configuracoes de 2FA.

## Validacao minima pos-migracao
- login normal sem 2FA
- ativacao de 2FA por celular
- ativacao de 2FA por e-mail
- ativacao de 2FA por ambos
- desligamento automatico ao remover os dois canais
