# VivianiCRM — contrato do projeto

> Atualizado em 2026-08-31 após leitura do repositório, documentação e schema.

## Identidade e manutenção

- Sistema: CRM operacional e landing pública para Viviani Serena.
- Mantenedora: usuário desta sessão (confirmado).
- Usuários previstos: ADMIN, COLLABORATOR e VIEWER segundo PRD. `COLLABORATOR` é o perfil público de produto; `MANAGER` é o valor legado do enum persistido e é normalizado nas bordas de API, JWT e CRM.
- Classificação: **crítico** — há dados pessoais, financeiros, credenciais, tokens OAuth, auditoria e consentimento LGPD.

## Escopo observado

- Landing: apresentação de serviços, resultados, depoimentos, FAQ, localização, CTA/WhatsApp, captura de lead com consentimento, analytics, vitals, sitemap, robots e revalidação.
- CRM: login/sessão, dashboard/métricas, leads, exportação, disparos de WhatsApp/e-mail, agenda, financeiro, edição/publicação do site, histórico de conteúdo, colaboradores, administração de integrações, segurança, notificações, PWA/offline e preferências.
- API: autenticação, perfis/permissões, leads, agenda, financeiro, conteúdo, templates, dispatches, métricas, dashboard, analytics, notificações, privacidade, usuários, segurança, administração e webhook WhatsApp.
- Infra vigente: monorepo pnpm/Turbo; API Express + Prisma; CRM/Landing Next.js 14; PostgreSQL, Redis e storage local em Docker Compose na VPS. Vercel, Render, Supabase e Upstash estão fora do ambiente vigente.

## Dados e tratamento

| Entidade                   | Campos observados                                                                                                  | Base legal/retensão                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| User                       | e-mail técnico, username normalizado, nome, telefone, senha hash, 2FA/TOTP, papel, foto, módulos, login e bloqueio | autenticação/contrato: **FALTA formalizar**; retenção: **FALTA**                          |
| Lead                       | nome, e-mail, telefone, origem, UTM, status, notas, consentimento, anonimização, arquivamento e datas              | consentimento para contato conforme SECURITY; 3 anos nos docs; confirmar política vigente |
| ConsentLog                 | e-mail, IP parcialmente anonimizado, versão/texto da política, data, canal                                         | obrigação de prova/consentimento; retenção: **FALTA confirmar**                           |
| Appointment                | lead, evento Google, data, duração, serviço, status, notas e datas                                                 | contrato/execução do atendimento: **FALTA aprovação**; retenção: **FALTA**                |
| Financial                  | tipo, categoria, valor, descrição, data, recorrência, tags, arquivamento e datas                                   | obrigação legal/contrato: **FALTA aprovação**; retenção: **FALTA**                        |
| Content/versions/templates | seção, chave, JSON/texto, versão, motivo, restaurador, autor e datas                                               | execução do serviço/auditoria: **FALTA**; histórico não deve ser apagado                  |
| Audit/security             | usuário, ação, recurso, detalhes, IP, severidade, resolução e timestamps                                           | interesse legítimo/auditoria nos docs; retenção 1 ano declarada, validar                  |
| Analytics/session/vitals   | IP, user-agent, referrer, páginas, duração, eventos, payload e métricas                                            | interesse legítimo para IP/user-agent nos docs; 90 dias declarados, validar               |
| EmailSettings              | SMTP, usuário, senha cifrada, remetentes, e-mail admin e autor da alteração                                        | credencial operacional; retenção/acesso: **FALTA formalizar**                             |
| Storage/integrações        | uploads, Google/WhatsApp tokens, números, configurações e mensagens                                                | consentimento/contrato conforme integração; retenção e controlador: **FALTA**             |

## Regras e decisões existentes

- TypeScript strict, sem `any` injustificado, sem segredos no código, `.env.example` sincronizado.
- Backend deve autorizar; UI apenas esconde/mostra capacidades. ADMIN tem acesso total; módulos não administrativos são dashboard, leads, agenda e financeiro.
- LGPD exige consentimento rastreável para leads; operações de privacidade e auditoria devem preservar histórico.
- Financeiro e histórico de conteúdo não devem ser apagados de modo destrutivo. Leads e lançamentos usam `deletedAt` como arquivamento; edição financeira cria uma substituição e arquiva a versão anterior; agendamentos são cancelados e mantêm o histórico.
- Stack de aplicação: Next App Router, TypeScript, Tailwind, shadcn, Express e Prisma. Infra vigente: Docker Compose self-hosted na VPS; não reintroduzir serviços gerenciados sem nova decisão explícita.

## Operação local

- Portas declaradas: landing `3000`, CRM `3001`, API `4000`.
- Fluxo esperado para demonstração: API local saudável, banco/Redis disponíveis ou uma configuração de demo explicitamente segura, landing capturando lead e CRM autenticando/consultando dados.
- Integrações Google, WhatsApp, SMTP e storage podem permanecer indisponíveis localmente se o app mostrar estado claro e os fluxos não mentirem sobre sucesso.
- Login aceita `username` ou e-mail; usernames são persistidos em minúsculas e comparados sem distinção de caixa. O e-mail técnico permanece obrigatório para compatibilidade com 2FA, convites e auditoria.

## Fora do escopo confirmado

- Deploy ou alteração de dados de produção sem validação e autorização específica.
- Inventar base legal, retenção, credenciais, contas ou dados reais.
- Remover WIP local não relacionado.
- Reduzir módulos a uma demo estática quando o fluxo real puder ser executado.

## FALTAS e decisões pendentes

- Manter a fronteira explícita entre perfil público `COLLABORATOR` e role persistida legada `MANAGER`; só trocar o enum do Prisma em uma migration reversível e aprovada.
- Formalizar base legal/retensão por entidade e responsável LGPD.
- Definir dados sintéticos seguros para a apresentação e credenciais locais.
- Banco vigente da demo: PostgreSQL novo em volume Docker na VPS, sem migração de dados.
- A migration `20260901090000_preserve_operational_history` adiciona os timestamps de arquivamento e tem `rollback.sql`; aplicar na VPS somente após autorização explícita de schema.
- Validar e corrigir todo item registrado em `.Codex/GAP-CHECK.md` antes de declarar apresentação pronta.
