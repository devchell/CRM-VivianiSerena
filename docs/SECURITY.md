# SECURITY — VivianiCRM

> **Versão:** 2.0  
> **Data:** 2026-04-04  
> **PRD:** /docs/PRD.md  
> **ARCHITECTURE:** /docs/ARCHITECTURE.md  
> **Status:** aprovado

---

## 1. THREAT MODEL (STRIDE)

### Ativos críticos

| Ativo | Confidencialidade | Integridade | Disponibilidade |
|---|---|---|---|
| **Dados de usuário (email, senha, 2FA)** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Dados de leads** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Dados financeiros** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Google OAuth tokens** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **WhatsApp tokens** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Logs de auditoria** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **API availability** | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

### Ameaças por STRIDE

#### S — Spoofing (falsificação)
- **Ameaça**: Atacante finge ser usuário válido
- **Superfície**: login, JWT, OAuth callback
- **Mitigação**:
  - ✅ Verificação de email obrigatória
  - ✅ JWT assinado com HS256/RS256
  - ✅ OAuth com `state` parameter (CSRF protection)
  - ✅ Tokens em Redis com TTL curto (1 hora)
  - ✅ 2FA obrigatório para admin

#### T — Tampering (manipulação)
- **Ameaça**: Atacante altera dados em trânsito ou em repouso
- **Superfície**: banco de dados, cache, API payload
- **Mitigação**:
  - ✅ HTTPS obrigatório (TLS 1.3)
  - ✅ Encriptação de senha (bcrypt + salt)
  - ✅ RLS em Postgres (validação no banco)
  - ✅ Assinatura de respostas API (validação de integridade)
  - ✅ Imutabilidade de financeiros (soft-delete, never update)
  - ✅ Versionamento de conteúdo (audit trail)

#### R — Repudiation (rejeição)
- **Ameaça**: Usuário nega ter executado ação
- **Superfície**: operações críticas (financeiro, LGPD, permissão)
- **Mitigação**:
  - ✅ Logs imutáveis de auditoria
  - ✅ Timestamps em UTC
  - ✅ User ID e IP hash em cada evento
  - ✅ Assinatura de export/delete LGPD

#### I — Information Disclosure (vazamento)
- **Ameaça**: Dados sensíveis expostos (PII, tokens, senhas)
- **Superfície**: logs, stack traces, cache, browser local storage
- **Mitigação**:
  - ✅ Senhas nunca em logs
  - ✅ Tokens em cookies HTTP-only (não localStorage)
  - ✅ PII não em URL (query string)
  - ✅ Stack traces não expostos em resposta (500 genérico)
  - ✅ Redação de logs (PII hashed ou removido)
  - ✅ Headers de segurança (CSP, X-Content-Type-Options)

#### D — Denial of Service (indisponibilidade)
- **Ameaça**: Atacante torna sistema indisponível
- **Superfície**: API, banco, cache, email
- **Mitigação**:
  - ✅ Rate limiting por IP (10 leads/min, 5 login/min)
  - ✅ Timeout em operações longas (30s default)
  - ✅ Circuit breaker para integrações (Google, WhatsApp)
  - ✅ Alertas de alta latência (>5s)
  - ✅ Backups automáticos (RPO 24h)
  - ✅ CDN com DDoS protection (Cloudflare)

#### E — Elevation of Privilege (escalada)
- **Ameaça**: Usuário comum escalona para admin
- **Superfície**: permissões, token, cookie
- **Mitigação**:
  - ✅ Permissões validadas no backend (nunca confiar no client)
  - ✅ `user_id` e `role` em JWT, validados em cada request
  - ✅ RLS em Postgres (row-level filtering)
  - ✅ Logs de mudança de perfil (auditado)
  - ✅ 2FA para operações sensíveis (delete, export, permission change)

---

## 2. SUPERFÍCIE DE ATAQUE

### Entrada pública

| Endpoint | Entrada | Validação | Risco |
|---|---|---|---|
| **POST /api/v1/leads** | email, name, phone, category | zod schema, sanitização | SQL injection, XSS, spam |
| **GET /api/v1/appointments/available** | date, duration | schema validação | enumeration, brute force |
| **GET /api/v1/auth/google/callback** | code, state | state validation, PKCE | CSRF, token stealing |
| **GET /api/v1/whatsapp/webhook** | events JSON | signature validation (Meta) | webhook spoofing |
| **POST /api/v1/auth/login** | email, password | rate limit, schema | brute force, credential stuffing |

### Entrada autenticada (risco maior)

| Endpoint | Entrada | Validação | Risco |
|---|---|---|---|
| **POST /api/v1/financials** | amount, category, date | schema, auth, RLS | manipulação de dados |
| **DELETE /api/v1/leads/:id** | lead_id | auth, RLS, soft-delete | deleção não-autorizada |
| **PATCH /api/v1/appointments/:id** | data do evento | auth, RLS, Google sync | alteração não-autorizada |
| **POST /api/v1/privacy/export** | email | auth, RLS | vazamento de dados |

### Integrações externas

| Integração | Entrada | Risco |
|---|---|---|
| **Google Calendar** | eventos JSON | webhook spoofing, token expiry |
| **Google Business Profile** | reviews JSON | token expiry, data freshness |
| **WhatsApp Business** | incoming messages | webhook spoofing, message forge |
| **Email (SMTP)** | bounce, delivery failure | none (uma via) |

---

## 3. VULNERABILIDADES POSSÍVEIS E MITIGAÇÕES

### OWASP Top 10 (2021)

#### A01:2021 — Broken Access Control
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| Usuário acessa recurso de outro | média | RLS + JWT role + server validation |
| Admin check apenas no client | alta | ✅ Backend valida sempre |
| URL enumeration (leads, appointments) | média | ✅ UUIDs (não IDs sequenciais) |
| Missing auth em endpoint | baixa | ✅ express-auth middleware obrigatório |

#### A02:2021 — Cryptographic Failures
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| Senha armazenada em plaintext | nenhuma | ✅ bcrypt com salt |
| Dados sensíveis em log | média | ✅ PII redated, tokens nunca logged |
| HTTP em desenvolvimento | baixa | ✅ HTTPS enforced em produção |
| Tokens em localStorage | nenhuma | ✅ Cookies HTTP-only |

#### A03:2021 — Injection
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| SQL injection | nenhuma | ✅ Prisma (prepared statements) |
| NoSQL injection | N/A | ✅ Usando Postgres, não MongoDB |
| Command injection | baixa | ✅ Sem shell execution |
| XSS (stored) | nenhuma | ✅ Prisma escapa, React escapa por default |
| XSS (reflected) | nenhuma | ✅ Next.js escape de params, CSP header |

#### A04:2021 — Insecure Design
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| Sem rate limiting | média | ✅ Redis rate limiter implementado |
| Consentimento não registrado | nenhuma | ✅ Checkbox obrigatório, consent_logs |
| Sem auditoria | nenhuma | ✅ Logs estruturados, security_events |
| Sem LGPD compliance | nenhuma | ✅ Export, delete, retenção documentada |

#### A05:2021 — Broken Authentication
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| Senha fraca | média | ✅ Validação: 8+ chars, letra, número, símbolo |
| Token nunca expira | nenhuma | ✅ JWT com exp (24h) + refresh |
| 2FA bypassable | nenhuma | ✅ Middleware valida 2FA antes de access |
| Session fixation | nenhuma | ✅ JWT assinado, cookie secure + httponly |

#### A06:2021 — Sensitive Data Exposure
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| PII em URL | média | ✅ Nunca em query string, sempre em body |
| Logs expõem senha | nenhuma | ✅ Redação automática de logs |
| Backup não encriptado | baixa | ✅ Supabase backups encriptados |
| Google tokens expostos | nenhuma | ✅ Tokens em Redis encriptado (AES) |

#### A07:2021 — Identification and Authentication Failures
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| Brute force | média | ✅ Rate limit: 5 login/min por IP |
| Default credentials | nenhuma | ✅ Sem usuarios padrão |
| Weak MFA | nenhuma | ✅ 2FA com TOTP ou email, obrigatório para admin |

#### A08:2021 — Software and Data Integrity Failures
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| Dependências vulneráveis | média | ✅ Dependabot, npm audit, renovate |
| CI/CD inseguro | baixa | ✅ GitHub secrets segregados por env |
| Unsigned deployments | nenhuma | ✅ Deploy via webhook autenticado |

#### A09:2021 — Logging and Monitoring Failures
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| Sem logs | nenhuma | ✅ Eventos críticos registrados |
| Logs sem timestamp | nenhuma | ✅ Timestamp UTC em cada log |
| Sem alertas de segurança | média | ✅ Alertas: brute force, 500 rate, offline |

#### A10:2021 — Server-Side Request Forgery (SSRF)
| Vulnerabilidade | Possibilidade | Mitigação |
|---|---|---|
| Webhook spoofing | média | ✅ Signature validation (Google, Meta) |
| Redirect abuse | nenhuma | ✅ Whitelist de redirect URIs (OAuth) |

---

## 4. CHECKLIST DE SEGURANÇA IMPLEMENTADO

### Autenticação
- ✅ Senha: bcrypt (10 salt rounds)
- ✅ Session: JWT com exp 24h
- ✅ Refresh: token em Redis com exp 7d
- ✅ 2FA: email OTP (6 dígitos, 5min TTL)
- ✅ OAuth: Google com state + PKCE
- ✅ Logout: invalida token em Redis

### Autorização
- ✅ Roles: ADMIN, COLLABORATOR, VIEWER
- ✅ Modules: leads, agenda, financeiro, cms, colaboradores, segurança
- ✅ RLS: row-level security em Postgres
- ✅ Backend validation: nunca confiar no client
- ✅ Menor privilégio: padrão é COLLABORATOR com módulos desativados

### Dados
- ✅ Validação: zod schema em todos os endpoints
- ✅ Sanitização: SQL escaped (Prisma), HTML escaped (React)
- ✅ Encriptação em repouso: PostgreSQL encryption (opcional), Google tokens em AES
- ✅ Encriptação em trânsito: HTTPS TLS 1.3
- ✅ LGPD: consentimento obrigatório, exportação, soft-delete

### API
- ✅ CORS: whitelist de domínios
- ✅ Rate limit: IP-based (login 5/min, leads 10/min, API 100/min default)
- ✅ Timeout: 30s default, 60s para operações longas
- ✅ Validação: zod schema obrigatória
- ✅ Idempotência: request-id deduplication

### Headers de segurança
- ✅ HTTPS redirect (301 permanent)
- ✅ Strict-Transport-Security (HSTS): 1 year, includeSubdomains
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: SAMEORIGIN (proteção contra clickjacking)
- ✅ Content-Security-Policy (CSP): script-src self, style-src self unsafe-inline, img-src self data
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy (Feature-Policy): geolocation=(), microphone=()

### Cookies
- ✅ Secure: true (HTTPS only)
- ✅ HttpOnly: true (JavaScript não acessa)
- ✅ SameSite: Strict (CSRF protection)
- ✅ Max-Age: 24h

### Logs e Auditoria
- ✅ Estrutura: timestamp, level, service, event, user_id, request_id
- ✅ Eventos críticos: login, logout, 2FA, permission change, export, delete, error
- ✅ PII redaction: emails hashed, senhas nunca, tokens nunca
- ✅ Imutabilidade: logs em banco (audit_logs, security_events)
- ✅ Retenção: 1 ano (produção), 30 dias (staging), 7 dias (dev)
- ✅ Acesso: apenas ADMIN pode visualizar

### Secrets
- ✅ Nunca em código (`.env` local, GitHub Secrets em produção)
- ✅ Segregação: dev/staging/prod separados
- ✅ Rotação: suportada via GitHub Secrets
- ✅ Tipos: DATABASE_URL, REDIS_URL, GOOGLE_CLIENT_ID, WHATSAPP_TOKEN, SMTP_PASSWORD, JWT_SECRET

### Integrações
- ✅ Google Calendar: token em Redis (encriptado), refresh automático, revoke suportado
- ✅ Google Business Profile: token compartilhado, failover graceful
- ✅ WhatsApp: webhook signature validation (X-Hub-Signature), token em env
- ✅ Email: SMTP com TLS, bounce handling
- ✅ Erro handling: não expõe detalhes de integração em resposta 500

### Infraestrutura
- ✅ Postgres: RLS habilitado, backups encriptados (7d retenção)
- ✅ Redis: password protegido, TTL em keys críticas
- ✅ Vercel: HTTPS enforced, preview branches segregados, secrets por ambiente
- ✅ Render: environment vars por ambiente, logs em stdout/stderr
- ✅ Cloudflare: DDoS protection, WAF rules, rate limiting

---

## 5. LGPD COMPLIANCE

### Dados pessoais mapeados

| Dado | Origem | Processamento | Base legal | Retenção |
|---|---|---|---|---|
| **Email** | Lead form / auth | Contato, newsletter | consentimento | até deleção |
| **Nome** | Lead form / auth | Contato | consentimento | até deleção |
| **Telefone** | Lead form | Contato, WhatsApp | consentimento | até deleção |
| **IP (anonimizado)** | Lead form | Analytics, fraud | interesse legítimo | 90 dias |
| **User agent** | Lead form | Analytics | interesse legítimo | 90 dias |
| **Logs de acesso** | CRM login | Auditoria | interesse legítimo | 1 ano |
| **Google tokens** | OAuth | Integração | consentimento | até revoke |

### Direitos de titular

| Direito | Endpoint | Implementação |
|---|---|---|
| **Acesso** | `GET /api/v1/privacy/export?email=` | ZIP com dados pessoais |
| **Correção** | `PATCH /api/v1/leads/:id` | Usuário altera via CRM |
| **Deleção** | `DELETE /api/v1/leads/:id` | Soft-delete, sem recuperação |
| **Portabilidade** | `GET /api/v1/privacy/export?email=` | JSON estruturado em ZIP |
| **Oposição** | `DELETE /api/v1/leads/:id` ou unsubscribe | Soft-delete, log de deleção |

### Consentimento

**Captura de leads (landing):**
```html
<checkbox required>
  Declaro que li e aceito a Política de Privacidade e autorizo o contato.
</checkbox>
```

**Registro:**
- Tabela: `consent_logs`
- Campos: `lead_id`, `consentedAt`, `ip_hash`, `user_agent`, `channel`
- Imutável: nunca modificado após criação

### Política de Privacidade

- 📄 Publicada em `/privacidade` (landing)
- 📄 Descreve: coleta (email, nome, telefone), processamento (contato), retenção (3 anos), direitos (acesso, correção, deleção)
- 📄 Assinada por cliente

---

## 6. VALIDAÇÃO CONTÍNUA

### Pentest mental (Red Team)

**Cenário 1: Atacante quer acessar leads de outro usuário**
1. Obtém UUID aleatória de lead
2. Faz `GET /api/v1/leads/abc-123-def`
3. Backend valida: JWT user_id, RLS filtra por user_id
4. Resposta: 403 (forbidden) — **MITIGADO**

**Cenário 2: Atacante quer escalar para admin**
1. Edita JWT no navegador (muda `role: "ADMIN"`)
2. Faz requisição com novo token
3. Backend valida assinatura JWT (secret no servidor)
4. Resposta: 401 (unauthorized, token inválido) — **MITIGADO**

**Cenário 3: Atacante quer flood de leads públicas**
1. Script automático faz POST em `/api/v1/leads` 100x em 1 minuto
2. Rate limiter bloqueia após 10 por minuto (mesmo IP)
3. Resposta: 429 (too many requests) — **MITIGADO**

**Cenário 4: Atacante quer apagar database**
1. Injeta SQL em lead form: `email: "'; DROP TABLE leads; --"`
2. Prisma escapa a string
3. Resposta: lead criado com email literal (sem execução SQL) — **MITIGADO**

**Cenário 5: Atacante quer roubar Google token**
1. Inspeciona Redux/estado do cliente
2. Vê variáveis de estado
3. Google token nunca é enviado para cliente (processado no backend apenas) — **MITIGADO**

---

## 7. RISCO RESIDUAL

### Riscos aceitáveis

| Risco | Probabilidade | Impacto | Aceitabilidade | Comentário |
|---|---|---|---|---|
| **Google OAuth indisponível** | baixa | médio | ✅ aceitável | Fallback: agendamento local funciona |
| **Brute force via múltiplos IPs** | médio | médio | ⚠️ mitigado | Rate limiting por IP; WAF Cloudflare adiciona proteção |
| **Email não entregue (2FA)** | baixa | alto | ⚠️ mitigado | Resend automático, backup SMS (Twilio) |
| **Postgres offline 1 hora** | muito baixa | crítico | ✅ aceitável | RTO 1 hora, RPO 24 horas, backup automático |
| **Redis offline** | muito baixa | médio | ✅ aceitável | Fallback: in-memory cache, performance degradada |
| **Atacante com acesso ao banco (breach)** | muito baixa | crítico | ⚠️ **limite** | Senhas com bcrypt irrecuperáveis; tokens expiram em 24h |
| **Verificação 2FA bypassada** | muito baixa | crítico | ⚠️ **limite** | Middleware obrigatório; sem fallback; auditado |

### Ações futuras

- [ ] Auditoria de segurança por terceiro (pentesting)
- [ ] WAF rules customizadas em Cloudflare (rate limiting por endpoint)
- [ ] Backup offline (S3 copy) para Postgres
- [ ] SIEM/XDR para detecção de anomalias
- [ ] Rotação de secrets (6 meses)
- [ ] Conformidade com ISO 27001 (opcional)

---

## 8. CHANGELOG

| Data | Versão | Alteração |
|---|---|---|
| 2026-03-20 | 1.0 | Criação inicial (threat model, OWASP checklist) |
| 2026-04-04 | 2.0 | Atualização pós cloud-native, detalhe de riscos residuais |
