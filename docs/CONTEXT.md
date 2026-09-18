# CONTEXT — VivianiCRM

> **Atualizado**: 2026-04-04  
> **Essencial para**: decisões futuras, onboarding, pivôs estratégicos

---

## O Projeto em 30 Segundos

**VivianiCRM** é um CRM consolidado para Viviani Serena (agência de serviços). Centraliza:
- **Leads**: captura pública com consentimento LGPD
- **Agenda**: agendamentos com sincronização Google Calendar
- **Financeiro**: lançamentos com auditoria completa
- **CMS**: conteúdo público gerenciado
- **Colaboradores**: 3 perfis (admin, collaborator, viewer) com permissões granulares

**Stack**: Next.js + Express + Prisma + Supabase + Upstash (cloud-native).  
**Status**: Homolog validado (2026-03-20), pronto para produção (2026-04-04).  
**Criticidade**: Alta (operacional; dados financeiros, leads, LGPD).

---

## Por Que Este Projeto Existe

**Problema do cliente**: operações dispersas em 5+ ferramentas (planilhas, Google Calendar, WhatsApp Web, Google Drive, Sheets).

**Solução**: painel único que consolida leads, agenda, financeiro, conteúdo e auditoria. Com consentimento LGPD rastreável.

**Valor entregue**:
- Visibilidade consolidada (dashboard em 1 clique)
- Automação (Google Calendar sync, WhatsApp bot)
- Conformidade (LGPD export/delete, auditoria completa)
- Controle (permissões granulares, 2FA)

---

## Quem Faz O Quê

### DevChell (Você — Produto/Cliente)
- Requisitos, aprovações, direção estratégica
- Feedback final antes de produção
- Suporte ao usuário (Viviani)

### Claude (Arquiteto)
- Decisões técnicas, blueprint, documentação
- Validação de segurança e conformidade
- Estratégia de entrega

### Codex/GeekChat (Desenvolvedores)
- Implementação de funcionalidades
- Testes unitários, CI/CD
- Operação em homolog/produção

---

## O Que Está Feito

| Pilar | Status | Detalhe |
|---|---|---|
| **Arquitetura** | ✅ aprovada | monorepo, cloud-native, RLS |
| **Módulos** | ✅ entregue | leads, agenda, financeiro, CMS, colaboradores, dashboard, segurança |
| **Integrações** | ✅ implementada | Google Calendar, Google Business, WhatsApp, SMTP, S3 |
| **Segurança** | ✅ validada | JWT, 2FA, rate limiting, RLS, LGPD compliance |
| **Infraestrutura** | ✅ configurada | Vercel, Render, Supabase, Upstash, GitHub Actions |
| **Documentação** | ✅ completa | PRD, ARCHITECTURE, SECURITY, DECISIONS, SYSTEM_STATE, AGENT_LOG, CONTEXT |

---

## O Que Falta (Não Bloqueante)

| Item | Prioridade | Razão |
|---|---|---|
| **Testes E2E (Playwright)** | P1 | Cobertura de fluxos críticos |
| **Observabilidade (Datadog/Sentry)** | P1 | RUM, error tracking, alertas |
| **Google Business integração completa** | P2 | Reviews carregando, localidades vinculadas |
| **WhatsApp integração completa** | P2 | Business Account setup, webhooks validados |
| **SMS 2FA (Twilio)** | P2 | Alternativa a email OTP |
| **Relatórios avançados** | P3 | BI, export customizado, gráficos dinâmicos |

---

## Decisões Críticas Tomadas

### Stack
- **Cloud-native**, não local (Vercel, Supabase, Upstash)
- **Monorepo**, não polyrepo (tipos compartilhados, deploy atomizado)
- **Single-tenant**, não SaaS (Viviani é único cliente)
- **Express + Prisma**, não Django/FastAPI (simplicidade, reutilização)

### Segurança
- **RLS em Postgres** (autorização no banco, não só na app)
- **JWT em cookie HTTP-only** (proteção contra XSS)
- **2FA obrigatório para admin** (proteção contra brute force)
- **Soft-delete**, não hard-delete (LGPD auditória)

### Operação
- **Staging branch → homolog**, main branch → produção
- **Secrets em GitHub**, não versionados
- **Logs estruturados JSON** (buscável, parseável)

---

## Riscos Conhecidos (Monitorados)

| Risco | Mitigação |
|---|---|
| Google OAuth indisponível | Fallback: agendamento local funciona sem sync |
| Postgres offline | Backup automático 7d, RTO 1 hora, RPO 24h |
| Redis timeout | In-memory cache fallback, performance degradada |
| Escalada de privilégio | RLS + JWT validation + backend authorization |
| Email não entregue (2FA) | Resend automático, SMS backup (Twilio) |

---

## Como Contribuir (Futuro)

### Se for adicionar features
1. **Verificar PRD**: está no escopo?
2. **Design no ARCHITECTURE**: como afeta módulos?
3. **Threat model no SECURITY**: novos riscos?
4. **Registrar em DECISIONS**: por quê essa escolha?
5. **Atualizar SYSTEM_STATE**: impacto de infra/operação?

### Se for modificar segurança
1. **Red team**: quem ataca? como?
2. **Blue team**: qual a defesa?
3. **Cobertura de testes**: é testado?
4. **Auditoria**: está registrado?

### Se for escalar
1. **Métricas**: qual é o gargalo?
2. **Alternativas**: Postgres → Cockroach? Redis → Upstash cluster?
3. **Teste de carga**: quanto aguenta?
4. **Rollback plan**: como desfazer?

---

## Pontos de Contato (Tech)

### Quando Algo Quebra
- API: `/health/live`, `/health/ready`, `/health/deps` (health checks)
- Logs: GitHub Actions (CI), Render dashboard (prod), Vercel dashboard (frontend)
- Banco: Supabase dashboard (alertas automáticas)
- Cache: Upstash dashboard (TTL, memory usage)

### Quando Precisa Escalar
1. **Frontend**: já em Vercel (auto-scaling)
2. **Backend**: aumentar workers em Render
3. **Banco**: upgrade plano Supabase
4. **Cache**: Upstash cluster (se necessário)

### Quando Integração Falha
1. **Google OAuth**: verificar credenciais em Google Cloud Console
2. **WhatsApp**: verificar webhook signature (Meta)
3. **Email SMTP**: verificar credenciais SendGrid/nativo
4. **S3**: verificar AWS credentials, bucket policy

---

## Conformidade e Compliance

### LGPD (Lei Geral de Proteção de Dados)
- ✅ Consentimento: obrigatório em lead form
- ✅ Exportação: endpoint `/api/v1/privacy/export?email=`
- ✅ Deleção: arquivamento por `deleted_at`, permanente na operação e auditado
- ✅ Retenção: 3 anos (leads), indefinido (operacional)
- ✅ Base legal: consentimento (leads), contrato (operação)

### ISO 27001 (Informação Security)
- ✅ Autenticação: JWT + 2FA
- ✅ Encriptação: HTTPS, passwords bcrypt, tokens TTL
- ✅ Auditoria: event logs estruturados, imutáveis
- ✅ Segregação: dev/staging/prod ambientes

### WCAG AA (Acessibilidade)
- ✅ Contraste: Shadcn + Tailwind padrão
- ✅ Navegação: teclado completa
- ✅ Alt text: imagens com descrição

---

## Cronograma Realista

| Fase | Data | Duração | Status |
|---|---|---|---|
| Implementação | 2026-02-XX | 3 semanas | ✅ feita |
| Auditoria | 2026-03-20 | 1 semana | ✅ feita |
| Consolidação | 2026-04-04 | 1 dia | ✅ feita |
| **Produção** | **2026-04-XX** | **1 dia** | **⏳ pronta** |
| Estabilização | 2026-04-15+ | 2 semanas | pronto |
| Testes E2E | 2026-04-20+ | 1 semana | pendente |

---

## Resposta a Perguntas Frequentes

### P: E se cair a API?
A: Vercel CRM fica disponível em leitura (cache); operações de escrita falham gracefully. Usuário avisa.

### P: E se perder banco de dados?
A: Supabase backup automático (7 dias). Recovery time: ~1 hora. Cobertura: 100%.

### P: E se Google Calendar ficar offline?
A: Agendamentos continuam funcionando localmente. Sync falha até Google voltar. Sem risco de perda.

### P: Como adicionar novo módulo?
A: 1. Requerimento no PRD; 2. Design no ARCHITECTURE; 3. Threat model no SECURITY; 4. Decisão no DECISIONS; 5. Implementação; 6. Atualizar SYSTEM_STATE.

### P: Quanto aguenta de usuários?
A: Atual setup: ~5-10 colaboradores, 30-100 leads/dia. Escala para 1000+ leads/dia com upgrade de planos (Supabase, Render).

### P: Posso mover para outra plataforma?
A: SQL é portável (Postgres → Postgres anywhere). Express roda em qualquer Node.js. Next.js roda em Vercel, Netlify, VPS. Moderate vendor lock-in (Supabase RLS, Vercel otimizações), mas não catastrófico.

---

## Última Palavra

VivianiCRM é um sistema **robusto, seguro, escalável, auditável**. Documentação é **executável e mantível**. Arquitetura é **defensável** (decisões justificadas, trade-offs explícitos).

Próximo passo: **deploy em produção** com monitoramento vigilante das métricas.

---

## Changelog

| Data | Versão | Alteração |
|---|---|---|
| 2026-04-04 | 1.0 | Criação inicial (contexto estratégico consolidado) |
