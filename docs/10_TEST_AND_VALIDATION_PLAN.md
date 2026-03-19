# 10 Test And Validation Plan

## Validacao automatizada atual
- `pnpm --filter @viviani/api test`
- `pnpm --filter @viviani/api build`
- `pnpm --filter @viviani/crm build`
- `pnpm --filter @viviani/landing build`
- `pnpm build:release`

## Cobertura atual
- testes unitarios da API para middleware de autenticacao e seguranca;
- validacao de build para os tres apps.

## Lacunas
- nao ha E2E cobrindo fluxo completo;
- nao ha cobertura relevante de rotas de dominio;
- o CRM ainda tem warnings visuais nao bloqueantes.

## Regressao manual prioritaria
- login e 2FA;
- colaboradores `Ativos` e `Inativos`;
- criacao e reenvio de convite;
- leads;
- agenda;
- financeiro;
- edicao e publicacao de conteudo;
- seguranca e privacidade com perfil admin.
