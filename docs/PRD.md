# PRD — VivianiCRM

> **Versão:** 2.0  
> **Data:** 2026-04-04  
> **Autor:** Claude (Arquiteto)  
> **Categoria:** CRM  
> **Status:** aprovado  
> **Cliente:** Viviani Serena

---

## 1. TL;DR

**VivianiCRM** é um CRM modular de gestão de relacionamento com clientes, desenvolvido para agências e serviços. Consolida **leads, agenda, financeiro, conteúdo público e segurança** em um único painel, integrando Google Calendar, Google Business Profile e WhatsApp Business para automação de fluxos.

Problema resolvido: operações dispersas em múltiplas ferramentas (planilhas, calendários, WhatsApp Web).  
Valor: visibilidade consolidada, automação, rastreabilidade LGPD e controle de permissões granular.

---

## 2. Problema

### Situação atual
O cliente gestiona relacionamento com clientes e operações através de:
- Planilhas de leads (sem histórico, sem rastreabilidade)
- Google Calendar (sem sincronização com CRM)
- WhatsApp Web (sem logging, sem conformidade LGPD)
- Pastas compartilhadas (sem versionamento)
- Planilhas de financeiro (consolidação manual, erro-prone)

### Dores principais
- **Leads desorganizados**: sem categorização, histórico perdido, duplicatas
- **Agendar sem controle**: múltiplos calendários, conflitos, sem rastreamento de autorização
- **Financeiro manual**: lançamentos duplicados, consolidação lenta, sem auditoria
- **Falta de conformidade**: nenhum registro de consentimento LGPD
- **Sem visibilidade operacional**: gestor não sabe o que a equipe faz
- **Segurança frágil**: sem autenticação, sem permissões, sem auditoria

### Impacto
- Perda de leads (esquecimento, duplicatas)
- Conflito de agenda (overbook)
- Erros financeiros (retrabalho, desperdício)
- Risco legal (LGPD, conformidade)
- Ineficiência operacional (tempo gasto consolidando dados)

---

## 3. Usuários e Personas

### Persona principal: Viviani (Gerente/Admin)
- **Quem**: proprietária da agência, responsável por operações e resultados
- **Nível técnico**: baixo-médio, confortável com software web
- **Objetivo**: visibilidade total do negócio, relatórios, controle de equipe, tomada de decisão rápida
- **Frustrações**: dados espalhados, consolidação manual lenta, sem rastreabilidade, falta de controle
- **Acesso**: Dashboard executivo, relatórios, configuração de equipe, segurança

### Persona secundária: Operador/Colaborador
- **Quem**: atendente, agenda, execução de atividades
- **Nível técnico**: básico
- **Objetivo**: ver seu trabalho no sistema, responder leads, agendar, registrar financeiro
- **Frustrações**: múltiplas ferramentas, fluxo confuso, sem feedback
- **Acesso**: Leads, agenda, registros financeiros do seu escopo

### Persona terciária: Viewer (Consultor/Monitor)
- **Quem**: pode ter acesso apenas leitura a certos módulos
- **Objetivo**: acompanhar métricas, não executar
- **Acesso**: Dashboard, relatórios, sem modificação

---

## 4. Objetivos do Sistema

1. **Consolidar** dados de leads, agenda e financeiro em um único painel
2. **Automatizar** integrações com Google Calendar e WhatsApp Business
3. **Rastrear** consentimento LGPD de leads públicos
4. **Controlar** acesso por perfil e módulo (admin, colaborador, viewer)
5. **Registrar** auditoria de todas as operações críticas
6. **Escalar** para múltiplos usuários com permissões granulares
7. **Entregar** relatórios e métricas consolidadas para decisão
8. **Integrar** Google Business Profile para prova social (reviews)

### Métricas de sucesso

| Métrica | Situação Atual | Meta |
|---|---:|---:|
| Leads rastreados | ~0 (planilhas) | 100% com consentimento LGPD |
| Agendar com Google Calendar | 0% | 100% (sincronização bidirecional) |
| Financeiro com auditoria | 0% | 100% (cada lançamento rastreado) |
| Operadores com perfil | 0% | 100% (acesso granular) |
| Conformidade LGPD | 0% | 100% (exportação, deleção, consentimento) |
| Uptime esperado | N/A | 99.5% |

---

## 5. Escopo

### Dentro do escopo (MVP)

**Módulos:**
- Leads (captura pública, CRM interno, export LGPD, deleção)
- Agenda (agendamentos, sincronização com Google Calendar)
- Financeiro (lançamentos, consolidação mensal, gráficos)
- CMS (conteúdo público, versionamento)
- Colaboradores (perfis, 2FA, permissões por módulo)
- Dashboard (métricas consolidadas)
- Segurança (events log, auditoria, checklist)

**Integrações:**
- Google Calendar (OAuth, CRUD de eventos)
- Google Business Profile (localidades, reviews)
- WhatsApp Business (Embedded Signup, envio via API)
- S3 (uploads opcionais)

### Fora do escopo (P2/P3)

- Marketing automation
- CRM com pipeline customizável
- Relatórios avançados em BI
- Mobile app nativo
- Integração com ERP
- Multi-tenant SaaS (versão específica para cliente único)

---

## 6. Módulos do Sistema

| # | Módulo | Descrição | Prioridade |
|---|---|---|---|
| 1 | **Leads** | Captura, CRM, export LGPD, deleção | P0 |
| 2 | **Agenda** | Agendamentos, Google Calendar, disponibilidade | P0 |
| 3 | **Financeiro** | Lançamentos, consolidação, gráficos | P0 |
| 4 | **CMS** | Conteúdo público, versionamento | P0 |
| 5 | **Colaboradores** | Perfis, 2FA, permissões por módulo | P0 |
| 6 | **Dashboard** | Métricas consolidadas, relatórios | P1 |
| 7 | **Segurança** | Event log, checklist, proteção | P1 |
| 8 | **Admin** | Configuração geral, integrações | P1 |

---

## 7. Requisitos Funcionais

### 7.1 Leads

- [DEFINIDO] Captura pública em landing page com e-mail, nome, telefone, categoria
- [DEFINIDO] Consentimento LGPD obrigatório (opt-in)
- [DEFINIDO] Registro de `consentedAt` e `channel` (landing_form)
- [DEFINIDO] CRM interno: lista, busca, filtros, export
- [DEFINIDO] Export LGPD: dados pessoais em ZIP
- [DEFINIDO] Deleção LGPD: apagar lead + consent logs
- [DEFINIDO] Histórico de comunicações (future: WhatsApp)
- [DEFINIDO] Categorização de leads (new, contacted, converted, rejected)

### 7.2 Agenda

- [DEFINIDO] CRUD de agendamentos
- [DEFINIDO] Vinculação com Google Calendar (OAuth)
- [DEFINIDO] Sincronização bidirecional de eventos
- [DEFINIDO] Exibição de disponibilidade (futura integração com horário de trabalho)
- [DEFINIDO] Cancelamento de agendamentos (com lógica de cascata no Google)
- [DEFINIDO] Histórico de agendamentos
- [DEFINIDO] Notificações de confirmação (future: SMS/WhatsApp)

### 7.3 Financeiro

- [DEFINIDO] CRUD de lançamentos (receita, despesa)
- [DEFINIDO] Categorização (default: vendas, despesa, outro)
- [DEFINIDO] Consolidação mensal automática
- [DEFINIDO] Gráficos: rosca geral, receita, despesa
- [DEFINIDO] Export para planilha
- [DEFINIDO] Auditoria de cada lançamento

### 7.4 CMS

- [DEFINIDO] Edição de conteúdo público (hero, seções, CTA)
- [DEFINIDO] Versionamento de conteúdo
- [DEFINIDO] Publicação imediata na landing
- [DEFINIDO] Upload de imagens (local ou S3)
- [DEFINIDO] Prova social: exibição de reviews do Google Business Profile

### 7.5 Colaboradores

- [DEFINIDO] Perfis: ADMIN, COLLABORATOR, VIEWER
- [DEFINIDO] Permissões por módulo (ativar/desativar por perfil)
- [DEFINIDO] 2FA por canal (email, SMS opcional via Twilio)
- [DEFINIDO] Gestão de usuários ativos/inativos
- [DEFINIDO] Logs de acesso
- [ASSUMIDO] Sem SAML/AD por enquanto; auth local + OAuth social

### 7.6 Dashboard

- [DEFINIDO] Card: leads novos (mês)
- [DEFINIDO] Card: agendamentos (próximos 7 dias)
- [DEFINIDO] Card: financeiro (receita/despesa mês)
- [DEFINIDO] Card: colaboradores (online, offline)
- [DEFINIDO] Acesso baseado em perfil (viewer vê dados, collaborator não vê segurança)

### 7.7 Segurança

- [DEFINIDO] Event log: login, alteração sensível, erro, falha
- [DEFINIDO] Checklist de segurança (auth ativa, 2FA, logs, backups)
- [DEFINIDO] IP block (admin pode bloquear IPs)
- [DEFINIDO] Rate limiting em endpoints críticos
- [DEFINIDO] Headers de segurança (CSP, HSTS, X-Frame-Options)

---

## 8. Requisitos Não Funcionais

### Segurança
- Autenticação via NextAuth + Supabase Auth
- Autorização no backend (nunca confiar no client)
- Menor privilégio por perfil e módulo
- 2FA obrigatório para admin
- Rate limiting em login, leads, APIs críticas
- Encriptação em trânsito (HTTPS obrigatório)
- Secrets fora do código (env vars)
- Logs auditáveis de todas as operações críticas
- Consentimento LGPD para captura pública
- Exportação e deleção de dados pessoais
- Segregação dev/staging/prod

### Performance
- Dashboard carrega em < 2s
- Leads busca em < 500ms
- Financeiro gráficos em < 1s
- API responde < 500ms (p99)
- Suporta 500+ agendamentos/mês
- Suporta 5.000+ leads ativos

### Disponibilidade
- Uptime 99.5% em produção
- RTO: 1 hora (rollback automático)
- RPO: 24 horas (backups diários)
- Graceful degradation se Google Calendar falhar
- Alertas para health checks críticos

### Acessibilidade
- WCAG AA mínimo
- Navegação por teclado
- Contraste adequado
- Alt text em imagens

### Compatibilidade
- Chrome, Firefox, Safari, Edge (últimas 2 versões)
- Mobile: responsive design
- Desktop: 1024px mínimo

---

## 9. Regras de Negócio

- **Leads**: consentimento é obrigatório; deleção é permanente
- **Agenda**: conflitos não são permitidos; cancelar no CRM cancela no Google
- **Financeiro**: lançamentos do futuro não contam na consolidação mensal atual
- **Colaboradores**: ADMIN têm acesso total; COLLABORATOR segue permissões por módulo
- **2FA**: obrigatório para ADMIN; opcional para outros
- **Exports**: apenas ADMIN pode exportar dados LGPD
- **Integrações**: falha em Google Calendar não bloqueia agendamento local
- **Rate limits**: max 10 leads/minuto de mesmo IP; max 5 tentativas de login/minuto

---

## 10. Integrações Externas

| Serviço | Finalidade | Obrigatório | Status |
|---|---|---|---|
| **Google Calendar** | Sincronização de agenda | não | implementado, teste em homolog |
| **Google Business Profile** | Reviews e prova social | não | implementado, teste em homolog |
| **WhatsApp Business** | Envio de mensagens | não | implementado, pode disparar |
| **Twilio** | SMS 2FA | não | implementado, não ativado |
| **S3** | Storage de uploads | não | implementado, opcional |
| **SMTP** | E-mails (notificação, 2FA) | sim | implementado (SendGrid/nativo) |
| **PostgreSQL** | Banco de dados | sim | Supabase |
| **Redis** | Cache, sessions, rate limit | sim | Upstash |

---

## 11. Segurança e Privacidade

### Dados sensíveis
- **Emails de leads**: entrada pública, armazenado, exportável
- **Telefones**: entrada pública, armazenado, exportável
- **Senhas/tokens**: hasheadas, nunca expostas
- **Google tokens**: encriptados em Redis, curta vida
- **Logs de consentimento**: auditáveis, permanentes (até deleção)

### Consentimento LGPD
- Necessário em landing form (checkbox obrigatório)
- Registrado em `consent_logs` com IP anonimizado
- Oferecido antes de qualquer ação
- Exportável junto com dados pessoais
- Deleção remove lead + consent logs

### Auditoria
- Logs de login, logout
- Logs de alteração de dados sensíveis
- Logs de export/delete LGPD
- Logs de permissão alterada
- Logs de 2FA ativado/desativado
- Logs de integração falha/sucesso

### LGPD
- **Finalidade**: CRM operacional (contato, agenda, financeiro)
- **Base legal**: consentimento (leads), contrato (operação)
- **Retenção**: 3 anos (leads); indefinido (operacional)
- **Exportação**: endpoint `GET /api/v1/privacy/export?email=`
- **Deleção**: endpoint `DELETE /api/v1/leads/:id` (soft delete)
- **Direitos**: acesso (exportação), correção (via CRM), deleção

---

## 12. Timeline e Entregas

| Fase | Entrega | Prioridade | Status |
|---|---|---|---|
| **Arquitetura** | Blueprint (ARCHITECTURE, SECURITY, DECISIONS) | P0 | ✅ em progresso |
| **MVP Core** | Leads + Agenda + Financeiro + CMS | P0 | ✅ implementado |
| **Auth & Perms** | NextAuth + perfis + 2FA | P0 | ✅ implementado |
| **Integrations** | Google Calendar, Google Business, WhatsApp | P0 | ✅ implementado |
| **Segurança** | Event log, checklist, rate limiting | P1 | ✅ implementado |
| **Testes** | Vitest (unitários) + Playwright (E2E) | P1 | ⏳ em andamento |
| **Homologação** | Validação completa em homolog | P1 | ✅ validada (2026-03-20) |
| **Produção** | Deploy em prod com monitoramento | P2 | ⏳ pronto |

---

## 13. Dependências e Riscos

### Dependências
- **Google OAuth**: obrigatório para Google Calendar e Google Business
- **Email SMTP**: obrigatório para 2FA e notificações
- **Supabase/PostgreSQL**: banco de dados
- **Upstash/Redis**: cache e rate limiting
- **Vercel**: hosting do CRM e landing
- **Render**: hosting da API

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Google OAuth indisponível | baixa | médio | fallback: operação local sem sync |
| Perda de leads (consentimento não registrado) | médio | alto | validação server-side obrigatória + logs |
| Escalada de privilégio (LGPD) | baixa | crítico | RLS em Postgres, auth no backend, auditoria |
| Conflito bidirecional Google Calendar | médio | médio | versioning, última escrita vence, alertar |
| Indisponibilidade de Supabase | baixa | crítico | backups diários, plano de recuperação |
| Rate limit acidental (lead flood) | médio | baixo | proteção por IP + CAPTCHA eventual |
| Dados sensíveis em logs | médio | alto | sanitização de logs, PII redacted |

---

## 14. Perguntas em Aberto

- [ ] Integração de WhatsApp será operacional em produção? (setup Meta OAuth)
- [ ] SMS via Twilio será utilizado ou apenas email para 2FA?
- [ ] Retenção de dados: após 3 anos, leads devem ser arquivados ou deletados?
- [ ] Backup automático: frequência? (recomendado: diário)
- [ ] Conformidade: auditoria de segurança por terceiro será necessária?
- [ ] Escalabilidade: volume esperado em 12 meses? (leads/mês, usuários)

---

## 15. Changelog

| Data | Versão | Alteração |
|---|---|---|
| 2026-03-20 | 1.0 | Criação inicial (consolidação de auditoria) |
| 2026-04-04 | 2.0 | Revisão pós-migração cloud-native, aprovação final |
