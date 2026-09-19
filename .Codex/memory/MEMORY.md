# Memória — VivianiCRM
Atualizado: 2026-09-19

## Estado atual

Clientes agora são a unidade principal na API/CRM: cadastro manual ou ligado a lead, edição em modal, pastas de atendimento datadas e reordenáveis, notas privadas, timeline de imagens, compressão WebP, storage privado e publicação seletiva com consentimento.
TyviaTalk permanece somente preparado por contrato/placeholders; nenhum domínio, e-mail ou segredo real foi inventado. A stack oficial é Docker Compose self-hosted na VPS.
Testes e builds locais passaram; o scan padrão/diff do plugin foi iniciado, mas ainda não foi selado. O commit `9c61757` foi publicado na VPS com os assets corrigidos da logo, favicon da landing e crossfade suave da sidebar; smoke visual no Brave aprovado.

## Decisões travadas

| Data | Decisão | Motivo | Reversível? |
|---|---|---|---|
| 2026-09-18 | Originais e derivados de pastas ficam fora de `/uploads` | Evitar exposição de PII e acesso sem autorização | Sim |
| 2026-09-18 | Publicação exige `editar-site.publish`, imagem e consentimento; retirar consentimento despublica | LGPD e separação entre operação de leads e editor público | Sim |
| 2026-09-18 | Limite de 100 mídias por pasta com lock de linha | Evitar crescimento acidental e corrida concorrente | Sim |
| 2026-09-19 | Cliente separado de pastas; ordem usa posição persistida e arraste nativo | Organizar retornos sem transformar cada atendimento em um novo cliente | Sim |
| 2026-09-18 | TyviaTalk só será habilitada após contrato de API, assinatura, retry e payload | Evitar integração falsa ou envio sem rastreabilidade | Sim |
| 2026-09-18 | Deploy mantém volumes Docker e usa preflight/smoke | PostgreSQL, Redis e uploads são persistentes | Sim |
| 2026-09-19 | Logo aprovada é preservada como PNG recortado, com variantes clara/escura e ícone | Regenerar tipografia/monograma alterava a marca; o PNG fonte mantém proporção e espaçamento | Sim |

## Descartado (não sugerir de novo)

| O quê | Por quê |
|---|---|
| Inventar endpoint, token, domínio ou e-mail TyviaTalk | Dados do provedor ainda não foram fornecidos |
| Servir mídia de cliente por `/uploads` público | Permite vazamento de originais e bypass do CRM |
| Permitir publicação a qualquer colaborador com acesso a leads | Permissão editorial é separada e precisa de consentimento |
| Adicionar biblioteca de galeria/picker só para esta feature | HTML, CSS, `sharp` e dependências já instaladas cobrem o fluxo |
| Regenerar a logo com IA para obter fidelidade tipográfica | Geradores não garantem a mesma tipografia, contorno e espaçamento da referência aprovada |

## Armadilhas conhecidas

- O projeto fixa pnpm 8.15.4; o runtime expõe pnpm 11. Use `pnpm dlx pnpm@8.15.4` para não invalidar o lockfile.
- Next 15 exige `params` como `Promise` em route handlers; o proxy CRM já segue esse contrato.
- `deploy/vps/.env` não pertence ao Git. O ambiente de homologação foi validado sem registrar seus segredos; produção ainda depende de domínio/TLS, rotação de credenciais e demais gates.
- O Deep Scan exige perfil de filesystem gerenciado; o host atual expõe filesystem irrestrito e recusou o worker read-only.

## Próximo passo

Receber o contrato real da TyviaTalk, rotacionar credenciais compartilhadas e selar o scan formal quando o worker estiver disponível. A homologação atual já tem a nova migration, preflight, smoke e proteção de `/clientes` validados.
