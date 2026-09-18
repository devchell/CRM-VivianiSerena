# Memória — VivianiCRM
Atualizado: 2026-09-18

## Estado atual

Pastas de clientes estão implementadas na API, CRM e landing: ligação opcional a lead, notas privadas, timeline de imagens, compressão WebP, storage privado e publicação seletiva com consentimento.
TyviaTalk permanece somente preparado por contrato/placeholders; nenhum domínio, e-mail ou segredo real foi inventado. A stack oficial é Docker Compose self-hosted na VPS.
Testes e builds locais passaram; o scan padrão/diff do plugin foi iniciado, mas ainda não foi selado.

## Decisões travadas

| Data | Decisão | Motivo | Reversível? |
|---|---|---|---|
| 2026-09-18 | Originais e derivados de pastas ficam fora de `/uploads` | Evitar exposição de PII e acesso sem autorização | Sim |
| 2026-09-18 | Publicação exige `editar-site.publish`, imagem e consentimento; retirar consentimento despublica | LGPD e separação entre operação de leads e editor público | Sim |
| 2026-09-18 | Limite de 100 mídias por pasta com lock de linha | Evitar crescimento acidental e corrida concorrente | Sim |
| 2026-09-18 | TyviaTalk só será habilitada após contrato de API, assinatura, retry e payload | Evitar integração falsa ou envio sem rastreabilidade | Sim |
| 2026-09-18 | Deploy mantém volumes Docker e usa preflight/smoke | PostgreSQL, Redis e uploads são persistentes | Sim |

## Descartado (não sugerir de novo)

| O quê | Por quê |
|---|---|
| Inventar endpoint, token, domínio ou e-mail TyviaTalk | Dados do provedor ainda não foram fornecidos |
| Servir mídia de cliente por `/uploads` público | Permite vazamento de originais e bypass do CRM |
| Permitir publicação a qualquer colaborador com acesso a leads | Permissão editorial é separada e precisa de consentimento |
| Adicionar biblioteca de galeria/picker só para esta feature | HTML, CSS, `sharp` e dependências já instaladas cobrem o fluxo |

## Armadilhas conhecidas

- O projeto fixa pnpm 8.15.4; o runtime expõe pnpm 11. Use `pnpm dlx pnpm@8.15.4` para não invalidar o lockfile.
- Next 15 exige `params` como `Promise` em route handlers; o proxy CRM já segue esse contrato.
- `deploy/vps/.env` não pertence ao Git. Sem ele não é possível provar preflight, credenciais ou deploy remoto.
- O Deep Scan exige perfil de filesystem gerenciado; o host atual expõe filesystem irrestrito e recusou o worker read-only.

## Próximo passo

Selar o scan formal quando o worker estiver disponível; depois validar migration na VPS, sincronizar o commit e executar preflight/smoke sem remover volumes.
