# SYSTEM_STATE - VivianiCRM

> **Versao:** 2.2
> **Data:** 2026-09-01
> **Status:** apresentação/homologação self-hosted na VPS
> **Fase:** Docker Compose em validação remota

> As seções 1 a 6 preservam o diagnóstico histórico do período cloud-first. O estado vigente é o da seção 7 e dos addenda posteriores.

---

## 1. Estado Atual

### Build e deploy

- Monorepo mantido: `apps/api`, `apps/crm`, `apps/landing` e pacotes compartilhados.
- `pnpm-lock.yaml` estava fora de sincronia com `apps/api/package.json`; corrigido em 2026-04-04.
- Projetos Vercel atuais identificados e religados: `crm` e `landing`.
- Aliases esperados foram corrigidos: `landing-viviani.vercel.app` e `crm-viviani.vercel.app`.
- Landing publicada em producao e validada por acesso compartilhavel temporario.
- CRM publicado em producao; o acesso externo continua dependente de Vercel Authentication / URL compartilhavel.
- API no Render nao responde nos endpoints de health conhecidos; servico precisa ser recriado.
- Chave de API Render disponivel no ambiente nao autenticou na API publica do provedor.

### Infraestrutura

```text
Frontend:
- Vercel project `landing`
- Vercel project `crm`

Backend:
- Render: servico da API ausente / nao validado

Data:
- Supabase: projeto `viviani-crm-prod` ativo e saudavel
- Upstash: endpoint REST respondeu `PONG`

DNS:
- dominio publico ainda nao configurado
```

### Validacao remota

```text
OK landing responde HTML em producao
OK alias `landing-viviani.vercel.app` corrigido para a build atual
OK alias `crm-viviani.vercel.app` corrigido para a build atual
OK Supabase respondeu consulta remota simples
OK Upstash respondeu `PONG`
WARN CRM continua protegido por Vercel Authentication para acesso externo
FAIL vivianicoaching.com nao resolve DNS
FAIL /health/live, /health/ready e /health/deps nao respondem nas URLs conhecidas
FAIL backend indisponivel para lead capture, login e rotas do CRM
```

---

## 2. Modulos

| Modulo        | Status de codigo | Status operacional                         |
| ------------- | ---------------- | ------------------------------------------ |
| Leads         | implementado     | bloqueado pela API ausente                 |
| Agenda        | implementado     | bloqueado pela API ausente                 |
| Financeiro    | implementado     | bloqueado pela API ausente                 |
| CMS           | implementado     | landing sobe, mas sem backend validado     |
| Colaboradores | implementado     | bloqueado pela API ausente                 |
| Dashboard     | implementado     | bloqueado pela API ausente                 |
| Seguranca     | implementado     | healthchecks e auditoria sem backend ativo |

---

## 3. Infra Impactada

- Vercel: projetos religados; arquivos `.vercel` devem permanecer fora do git.
- Render: servico web da API precisa ser recriado a partir de `render.yaml`.
- Supabase: projeto validado; falta apenas consumo pela API publicada.
- Upstash: Redis serverless validado; falta apenas consumo pela API publicada.

---

## 4. Riscos

- API fora do ar bloqueia lead capture, login e consultas do CRM.
- CRM ainda depende de URL compartilhavel temporaria enquanto a Vercel Authentication estiver ativa.
- CRM nao pode ser demonstrado funcionalmente enquanto a API nao existir.
- Dominio publico e SEO ficam incoerentes enquanto DNS nao estiver configurado.
- CI pode falhar se secrets novos nao forem alinhados com os projetos recriados.
- Render segue sem automacao funcional ate regularizar credencial/workspace.

---

## 5. Divida Tecnica

- Limpeza definitiva de arquivos `.vercel` rastreados pelo git.
- Normalizacao completa da documentacao de deploy para a nova infra.
- Validacao local ainda limitada pelo ambiente atual estar em Node 24, fora do range exigido pelo projeto.

---

## 6. Proximas Acoes

1. Recriar a API no Render a partir de `render.yaml` com credencial valida.
2. Aplicar as secrets da API e executar migrations/seed em producao.
3. Revalidar `/health/live`, `/health/ready` e `/health/deps`.
4. Revalidar login do CRM e captura de lead na landing.
5. Configurar DNS publico e revisar canonical/SEO com dominio definitivo.

---

## 7. Estado vigente — Docker self-hosted na VPS (2026-08-31)

- O estado cloud-first acima foi superseded pelo pedido vigente: tudo roda na VPS, sem Vercel, Supabase, Render ou Upstash.
- Compose implantado em `/opt/viviani-crm` com Nginx, Landing, CRM, API, PostgreSQL 16 e Redis 7; PostgreSQL/Redis sem portas publicas.
- Banco novo criado do zero, sem migracao de dados. O schema Prisma foi aplicado e as quatro migrations de feature foram registradas como baseline por ausencia de migration inicial no repositorio.
- Confirmado: API `/health` 200 com database/redis/uploads; landing, CRM, paginas legais e manifest 200; login, troca de senha e leitura de lead verificados no navegador; lead com consentimento persistido.
- Instancias localhost encerradas; listeners locais 3000/3001/4000 confirmados ausentes.
- Pendencias reais: TLS por dominio/certificado, backup externo, firewall/cloud rules, RLS, integrações SMTP/Google/WhatsApp e decisão sobre exclusão física/cascade.

### Addendum — redesign e verificação final da apresentação (2026-08-31)

- DNA visual documentado em `docs/23_DESIGN_DNA_AND_AUDIT.md` e aplicado à landing pública e ao CRM.
- Landing sem linguagem visual genérica de IA: sem estrelas/Sparkles, emojis decorativos, partículas, 3D, blur ornamental ou gradientes decorativos; parallax restrito ao background do HERO.
- CRM validado em desktop e mobile com rotas autenticadas, menu mobile, modal de novo lead e modal de novo agendamento; sem erros de browser observados.
- Nginx passou a resolver o upstream interno dinamicamente para evitar `502` após recriação do container da landing.
- Google Calendar, SMTP/e-mail e WhatsApp estão implementados no código e expostos com estado honesto no painel, mas permanecem `pendentes` na VPS por falta de credenciais/autorização externas.
- Estado atual continua sendo apresentação/homologação: HTTP por IP, sem TLS, sem backup externo automatizado e sem validação RLS.

### Addendum — hardening backend e verificação externa (2026-08-31 / 2026-09-01 UTC)

- O webhook WhatsApp agora falha fechado: sem configuração retorna 503 e sem assinatura HMAC válida retorna 403; o challenge GET exige verify token configurado e correspondente.
- Tokens OAuth do Google Calendar são criptografados antes de persistir no Redis; a leitura legada existe somente para compatibilidade de tokens já gravados.
- SMS não é mais reportado como enviado quando Twilio está ausente; a operação retorna falha explícita.
- Templates de e-mail escapam conteúdo interpolado e o endpoint de teste não expõe a senha baseline.
- Nginx publica `/health/ready` e `/health/deps` para verificação operacional externa; configuração validada com `nginx -t`.
- Estado remoto final: seis containers healthy; verificações negativas 401/400/503 e sweep CRM 390px/1440px concluídos sem erro de browser.

### Estado final do runtime — 2026-08-31 / 2026-09-01 UTC

- O runtime executado na VPS não depende de Vercel, Supabase, Render ou Upstash: Docker Compose usa PostgreSQL, Redis local, API, CRM, Landing e Nginx.
- A última imagem foi recriada sem os adapters cloud; os seis containers estão saudáveis e os artefatos temporários de deploy foram removidos.
- A validação pública pós-redeploy repetiu health/readiness, login, rotas legais, site-summary e contratos de falha de autenticação/consentimento/WhatsApp.

### Addendum — restauração e upgrade da landing (2026-09-01)

- A estrutura anterior foi restaurada, incluindo HERO em imagem inteira, headline com sublinhado, CTAs, credenciais e carrossel.
- O parallax pedido foi mantido somente no background do HERO (`12%`); texto, CTAs e demais elementos da frente permanecem no fluxo normal.
- Removidos partículas, `Sparkles`, estrelas Unicode, emojis/símbolos decorativos, FOMO padrão, depoimentos artificiais, RandomUser e referências Wix do HTML público.
- HERO, selo de certificação e imagem do JSON-LD usam assets locais; seis containers continuam `healthy` e a landing respondeu HTTP 200 após o redeploy.
- Browser local bloqueia a porta 80 com `ERR_BLOCKED_BY_CLIENT`; a landing não foi declarada visualmente validada por interação browser nesse ambiente.

### Addendum — contrato de perfis e roles (2026-09-01)

- O perfil público é `COLLABORATOR`; `MANAGER` permanece documentado como valor legado do enum Prisma persistido.
- API, JWT e CRM normalizam os dois nomes para o mesmo comportamento e não expõem uma permissão diferente por causa do vocabulário.
- A troca do enum não foi feita: exige migration reversível e aprovação de schema; nenhum dado foi migrado.

### Addendum — preservação do histórico operacional (2026-09-01)

- O código local deixou de excluir fisicamente leads e lançamentos em operações normais; ambos são arquivados com `deleted_at` e saem das consultas operacionais.
- Correções financeiras usam substituição versionada; agendamentos são cancelados e mantêm histórico após a remoção do evento Google.
- Testes da API passaram com 33 testes.
- A migration reversível foi aplicada na VPS autorizada: `20260901090000_preserve_operational_history`; `deleted_at` existe em `leads` e `financials`, e o registro consta em `_prisma_migrations`.
- Pós-deploy confirmado: seis containers `healthy`, health/readiness/deps públicos em 200, seed idempotente preservando os registros existentes e contagens operacionais verificadas (`leads_active=1`, `financials_active=0`, `appointments=0`).

### Addendum — performance de imagens da landing (2026-09-01)

- O HERO foi convertido de JPEG original de 6 MB para WebP local de 44 KB, com placeholder blur imediato.
- O `next/image` agora prioriza WebP e limita variantes a 1920 px; request frio medido na VPS em aproximadamente 0,4 s, com `Content-Type: image/webp`.
- A landing foi recriada sem tocar em banco, Redis, API ou CRM; os seis containers permanecem `healthy`.

### Addendum — autenticação por username da Viviani (2026-09-01)

- O schema agora suporta `users.username` nullable/unique por meio da migration reversível `20260901110000_add_usernames`.
- A conta ADMIN existente de Viviani Serena recebeu o username normalizado `viviani`; o e-mail técnico foi preservado para 2FA, convites e compatibilidade.
- API e CRM aceitam o identificador sem diferenciar maiúsculas/minúsculas e a senha inicial exige troca antes do dashboard.
- Evidência remota: `prisma migrate status` sem pendências; login com `ViViaNI` e com o e-mail retornou 200, `username=viviani` e `mustChangePassword=true`; seis containers permaneceram saudáveis.
