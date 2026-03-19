# 07 Dead Code And Deprecation Report

## Estado atual
O repositorio ja passou por limpeza relevante, mas ainda existe codigo que merece revisao antes de ser tratado como definitivo.

## Itens para manter sob observacao
- warnings de `no-img-element` em `apps/crm/src/app/(dashboard)/editar-site/page.tsx`;
- endpoints legados mantidos por compatibilidade, como `POST /auth/2fa/toggle`;
- suporte a `role` legado (`ADMIN`, `MANAGER`, `VIEWER`) preservado por compatibilidade com o banco.

## Itens intencionalmente mantidos
- `MANAGER` como role persistida do perfil `COLLABORATOR`;
- `VIEWER` como role persistida do perfil `VIEWER`;
- compatibilidade com grants antigos por modulo e por permissao.

## Candidatos futuros a remocao
- endpoints legados de 2FA depois que o CRM depender apenas de `PUT /auth/2fa/preferences`;
- qualquer fluxo que ainda use permissao derivada no frontend sem necessidade.
