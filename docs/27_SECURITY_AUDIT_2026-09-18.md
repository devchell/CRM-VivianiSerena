# Relatório de segurança — 2026-09-18

Escopo: checkout atual do VivianiCRM, API Express/Prisma, CRM/Landing Next.js, Socket.IO, analytics público, dispatch/WhatsApp, Docker/Nginx e scripts de VPS. A auditoria combinou revisão estática, testes de unidade/API e revisão manual orientada a abuso. Nenhuma credencial real foi lida, criada ou inventada.

## Correções aplicadas

| Item | Status | Evidência | Correção |
|---|---|---|---|
| Socket entrega PII de lead a qualquer usuário na sala `dashboard` | Corrigido | `apps/api/src/routes/leads.ts` | Removido o evento `new_lead` com nome, e-mail e telefone. Permanece apenas a invalidação não sensível `data_changed`. |
| Notificações misturavam leads, finanças e segurança sem permissão | Corrigido | `apps/api/src/routes/notifications.ts` | GET e marcação de leitura exigem `dashboard.view`; IDs limitados a 100 e deduplicados. |
| Templates automáticos legíveis por qualquer usuário autenticado | Corrigido | `apps/api/src/routes/content.ts` | Leitura e alteração exigem `leads.broadcast`. |
| Analytics aceitava `sessionId` reutilizado para alterar sessão alheia | Corrigido | `apps/api/src/routes/analytics.ts`, `apps/api/src/lib/analyticsSession.ts`, `apps/landing/src/lib/analytics.ts` | Sessões públicas agora exigem prova HMAC derivada do segredo do servidor; IDs sem prova não são associados. Payloads têm limites. |
| Lead público podia associar sessão arbitrária | Corrigido | `apps/api/src/routes/leads.ts` | Associação exige a mesma prova HMAC de analytics. |
| Segredo de revalidação em query string | Corrigido | `apps/api/src/routes/content.ts`, `apps/landing/src/app/api/revalidate/route.ts` | Segredo enviado em `x-revalidate-secret`. |
| Health público revelava versão, ambiente e dependências | Corrigido | `apps/api/src/app.ts` | Liveness/health retornam estado mínimo; dependências detalhadas exigem `seguranca.view`. |
| Compose permitia fallback de senha/runtime e expunha portas internas | Corrigido | `docker-compose.yml` | Segredos e flags críticos são obrigatórios; API/CRM ficam presos a localhost no Compose base. |
| PII em logs e auditoria de e-mail/SMS/dispatch | Corrigido | `apps/api/src/lib/redact.ts`, `email.ts`, `sms.ts`, `AuditLogger.ts`, `dispatches.ts`, `requestLogger.ts` | E-mail/telefone mascarados, IP anonimizado e entrada completa não é logada em falha de auditoria. |
| Plugin Tailwind usado pelo config compartilhado não era dependência do pacote | Corrigido | `packages/config/package.json`, `pnpm-lock.yaml` | Dependências declaradas no pacote que executa o `require`. |
| Reenvio de webhook/idempotência de dispatch | Corrigido | `apps/api/src/infrastructure/whatsapp.ts`, `apps/api/src/routes/dispatches.ts` | Timeout de 15s, reserva NX no Redis, deduplicação de receipts por 24h e falha quando provider não retorna ID. |
| Pasta de cliente expunha risco de PII e mídia privada | Corrigido | `apps/api/src/routes/clientFolders.ts`, `apps/api/src/infrastructure/storage.ts` | Originais e derivados ficam fora de `/uploads`; a API pública retorna somente metadados editoriais e mídia otimizada, exige publicação e consentimento também na rota direta; notas, nome e chaves nunca saem no endpoint público. |
| Upload de imagem podia consumir memória/disco sem limite operacional | Corrigido | `apps/api/src/routes/clientFolders.ts`, `apps/api/src/routes/clientFolders.spec.ts` | Multer limita o arquivo, Sharp valida formato/pixels, remove EXIF, redimensiona sem ampliar, gera WebP quality 90 e limita a 100 mídias por pasta com lock de linha. |
| Colaborador com permissão de leads poderia publicar ou conceder autorização | Corrigido | `apps/api/src/routes/clientFolders.ts`, `apps/api/src/routes/clientFolders.spec.ts` | Publicação, metadados públicos e consentimento exigem `editar-site.publish`; retirada de consentimento despublica a pasta. |
| Dependências com advisories conhecidos | Corrigido | `package.json`, `apps/api/package.json`, `pnpm-lock.yaml` | `js-yaml`, `nodemailer`, `morgan` e `postcss-selector-parser` foram elevados para versões corrigidas; `pnpm audit --prod` não reporta vulnerabilidades conhecidas. |

## Riscos ainda bloqueantes

| Item | Status | Severidade | Ação necessária |
|---|---|---:|---|
| Credenciais de baseline apareceram em histórico Git anterior | Aberto operacional | Alta | Rotacionar senhas, invalidar sessões/tokens e confirmar que a credencial antiga falha. Não reescrever histórico neste checkout sem autorização explícita. |
| Produção real depende de domínio/TLS, e-mail autorizado, secrets VPS, firewall/SSH, backup externo/restore e RLS comprovada | Aberto externo | Alta | Executar `deploy/vps/preflight.sh` com valores reais e só então promover. |
| Contrato TyviaTalk não foi fornecido | Bloqueado por contrato | Alta | Receber endpoint, autenticação, payload de envio, ID de mensagem, webhook, assinatura, eventos e política de retry antes de habilitar. |
| Deep Scan do plugin | Não executado | Limitação de ferramenta | O plugin recusou iniciar worker read-only porque o host expõe filesystem irrestrito em vez do perfil gerenciado exigido. A revisão estática e os testes locais foram executados; isso não equivale a um Deep Scan. |

## Validação executada

- API: Vitest — 22 arquivos, 74 testes aprovados.
- API: TypeScript `tsc --noEmit` aprovado.
- CRM: ESLint direcionado e build Next.js aprovados; 21 rotas geradas.
- Landing: ESLint direcionado e build Next.js aprovados; 10 rotas geradas.
- Navegador: smoke visual no Codex In-app Browser; CTA de resultados, validação do formulário, login vazio e mostrar/ocultar senha verificados. O Brave não está exposto ao ambiente.
- Dependências: `pnpm@8.15.4 audit --prod` sem vulnerabilidades conhecidas.
- Scan formal: o Standard Scan foi iniciado, mas permaneceu em `preflight` nesta execução e ainda não foi selado; o Deep Scan foi recusado pelo host por exigir perfil de filesystem gerenciado. Isso não equivale a um resultado sem achados.
- Não testei fluxos autenticados com credenciais reais, produção, invasão externa, restore de backup, RLS no PostgreSQL remoto ou envio real por WhatsApp/e-mail.

## Próximas verificações obrigatórias

1. Com secrets reais em ambiente controlado: `docker compose config` deve falhar quando qualquer secret/flag obrigatório faltar.
2. Testar usuário sem `leads.view`, `dashboard.view` e `leads.broadcast` nos endpoints/socket correspondentes.
3. Repetir analytics com `sessionId` de outra sessão e prova inválida; nenhuma sessão alheia deve ser alterada.
4. Rotacionar credenciais históricas antes de qualquer deploy de produção.
