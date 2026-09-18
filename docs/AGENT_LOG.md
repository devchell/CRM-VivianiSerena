# AGENT_LOG - VivianiCRM

> **Cronograma:** 2026-03-19 -> 2026-04-04
> **Objetivo:** rastrear alteracoes que impactam continuidade tecnica

---

## Sessao: 2026-04-04 - Saneamento de Infra Recriada

### Acao objetiva
- verificar o estado real apos reset de Vercel e Render
- remover ruido legado de bootstrap
- sincronizar `pnpm-lock.yaml` com o estado atual do codigo

### Impacto
- projetos Vercel atuais confirmados: `crm` e `landing`
- identificado vinculo local legado com `crm-hml`
- corrigidos aliases `landing-viviani.vercel.app` e `crm-viviani.vercel.app`
- landing publicada e validada por URL compartilhavel temporaria
- confirmado que a API nao responde nas URLs Render conhecidas
- Supabase validado com projeto ativo e consulta remota simples
- Upstash validado com resposta `PONG`
- chave Render disponivel no ambiente retornou `Unauthorized` na API publica
- atualizado `PRODUCTION_SETUP.md` para rebootstrap cloud do zero
- atualizado `SYSTEM_STATE.md` para refletir a recriacao da infraestrutura
- corrigido `pnpm-lock.yaml` para depender de `@supabase/supabase-js` e `@upstash/redis`, removendo ruido antigo

### Pendencia
- recriar servico da API no Render
- manter URLs compartilhaveis para a apresentacao enquanto a protecao Vercel estiver ativa
- revalidar healthchecks e fluxos apos novo deploy

---

## Sessao: 2026-04-04 - Consolidacao de Documentacao

### Acao objetiva
- consolidar PRD, arquitetura, seguranca, decisoes e estado do projeto

### Impacto
- documentacao obrigatoria estruturada
- stack cloud-first registrada
- modulos e regras de seguranca documentados

### Pendencia
- produzir deploy validado em infraestrutura ativa

---

## Sessao: 2026-03-20 - Validacao de Homolog

### Acao objetiva
- validar homolog apos a migracao cloud-native

### Impacto
- fluxos de leads, agenda e financeiro validados na epoca
- healthchecks e integracoes confirmados naquele ambiente

### Pendencia
- esse estado ficou obsoleto apos o reset da infraestrutura

---

## Sessao: 2026-08-31 - Deploy Docker self-hosted

### Acoes
- encerradas as instancias locais de apresentacao;
- adicionados Dockerfiles para API, CRM e Landing, Compose com Nginx/PostgreSQL/Redis e env de VPS;
- corrigidos pontos de consentimento, XSS de bio, traversal de upload, cookies HTTP de demonstracao, HSTS condicional, catches silenciosos e seed com senhas externas;
- instalados Docker/Compose na VPS e implantado banco novo sem migracao de dados;
- criada baseline do schema Prisma atual devido ao repositorio nao conter migration inicial.

### Evidencias
- `pnpm test`: 23/23; `pnpm lint`: 7/7; `pnpm audit`: sem vulnerabilidades conhecidas; `pnpm build`: concluido para API/CRM/Landing;
- Compose: seis servicos healthy; health API com database/redis/uploads true;
- HTTP externo: landing, CRM, API, privacidade, termos e manifest retornaram 200;
- navegador: login, troca obrigatoria de senha, novo login e listagem do lead persistido confirmados.

### Pendencias honestas
- implantacao atual e de apresentacao por HTTP/IP; TLS/HSTS/cookies Secure ficam para dominio/certificado;
- sem backup externo, alertas, RLS validada e credenciais das integracoes externas;
- divergencias de regra de exclusao e nomenclatura de papeis ainda requerem decisao de produto.

## Sessao: 2026-08-31 — Auditoria visual e fechamento de apresentação

### Acoes
- aplicado DNA visual editorial clínico na landing inteira, incluindo seções públicas que ainda carregavam estilos legados;
- removidos efeitos e símbolos associados à linguagem genérica de IA: gradientes decorativos, blur ornamental, partículas, parallax, 3D, estrelas/Sparkles e emojis de interface;
- aplicado bridge de tokens no CRM para telas legadas e refatorados leads, agenda, dashboard, autenticação e shell;
- validado navegador real no CRM em 1440px e 390px, com menu mobile e modais de criação cancelados sem mutação;
- redeploy realizado com recriação explícita de API, CRM, landing e Nginx.

### Evidencias
- `pnpm lint`: 7/7; `pnpm test`: 24/24; `pnpm build`: concluído; `pnpm audit`: sem vulnerabilidades conhecidas;
- landing, páginas legais, manifest, CRM e healthchecks externos retornaram 200;
- API confirmou proteção de consentimento, autenticação administrativa e validação do webhook WhatsApp;
- landing HTML público sem `localhost`, gradiente ornamental, estrela decorativa ou depoimento artificial;
- browser CRM sem erros nos módulos percorridos; landing por browser desta máquina bloqueada pelo cliente com `ERR_BLOCKED_BY_CLIENT`, apesar do `curl` retornar 200.

### Pendencias honestas
- credenciais e autorização de Google Calendar, SMTP e WhatsApp ainda não existem na VPS;
- domínio/TLS, backup externo, firewall e RLS continuam fora da evidência desta apresentação;
- senha root da VPS foi compartilhada no chat e deve ser rotacionada pelo responsável antes de qualquer uso real.

## Sessão: 2026-08-31 — hardening final e redeploy validado

### Ações
- corrigido o guard de tipagem do status do Google Calendar;
- tokens OAuth do Google passaram a ser persistidos criptografados no Redis, com leitura temporária compatível com o formato legado;
- webhook WhatsApp passou a exigir configuração, assinatura válida e corpo bruto verificável; challenge sem token configurado não é aceito;
- removida a simulação de SMS quando Twilio não está configurado;
- removido o segredo de senha baseline da resposta administrativa e escapados valores de templates HTML/e-mail;
- Nginx passou a publicar `/health/ready` e `/health/deps` encaminhando para a API, além do `/health` estático;
- imagem Docker reconstruída e API, CRM, Landing e Nginx recriados sem tocar nos volumes de PostgreSQL/Redis.

### Evidências
- `pnpm --filter @viviani/api test`: 24/24; `pnpm test`: 24/24; `pnpm lint`: 7/7; `pnpm build`: concluído; `git diff --check`: sem erro de whitespace;
- VPS: 6/6 containers `healthy`, incluindo PostgreSQL 16 e Redis 7; `nginx -t` aprovado;
- HTTP externo: `/health`, `/health/ready`, `/health/deps`, páginas legais, manifests, login, API live/ready e `site-summary` retornaram 200;
- contratos negativos externos: admin sem autenticação 401, lead sem consentimento 400, webhook sem configuração 503;
- browser real: 10 rotas CRM em 390px sem overflow, dashboard em 1440px sem overflow, painel de integrações sem erro e console de página vazio;
- detector de depoimento artificial revisado: “Maria Silva” está somente no placeholder do campo de nome, não em avaliação publicada.

### Pendências honestas
- apresentação ainda é HTTP por IP; domínio, TLS, firewall, backup externo e rotação da senha root continuam necessários antes de produção;
- Google Calendar, SMTP e WhatsApp têm implementação e estados `pendente`, mas não foram ativados sem credenciais/autorização externas;
- RLS e política formal de retenção/rollback de schema continuam não comprovadas.

## Sessão final — self-hosted sem legado cloud (2026-08-31 / 2026-09-01 UTC)

- Removidos do runtime os adapters Supabase/Upstash, o keep-alive Render e os artefatos de deploy Vercel/Render; storage e Redis ficaram locais ao Docker Compose.
- Removidos `render.yaml`, workflow de deploy cloud e `.vercel`; `pnpm-lock.yaml` não contém os pacotes Supabase/Upstash.
- Imagem final reconstruída e implantada em `/opt/viviani-crm`; seis serviços ficaram `healthy`, com Nginx validado por `nginx -t`.
- HTTP público e contratos negativos repetidos após o redeploy: 200 nos health/rotas públicas, 401 sem autenticação, 400 sem consentimento e 503 no WhatsApp sem configuração.
- Pacotes temporários de deploy removidos localmente e da VPS; listeners locais 3000/3001/4000 permanecem encerrados.

## Sessão: 2026-09-01 — restauração da landing e upgrade sem linguagem de IA

### Ações
- Restaurada a estrutura visual original da landing após rejeição do redesign genérico: HERO em imagem inteira, headline, sublinhado, CTAs, credenciais e carrossel.
- Mantido o parallax solicitado somente no background (`useScroll/useTransform`, deslocamento de 12%); texto e CTAs continuam normais.
- Removidos canvas de partículas, `Sparkles`, estrelas Unicode, emojis/símbolos decorativos, FOMO padrão, depoimentos artificiais, RandomUser e hover roxo/rosa.
- Serviços passaram a usar ícones Lucide contextuais; fallback do HERO, selo de certificação e imagem do JSON-LD passaram para assets locais.

### Evidências
- `pnpm --filter @viviani/landing lint`: passou; `pnpm --filter @viviani/landing build`: passou.
- VPS após redeploy: API, CRM, Landing, Nginx, PostgreSQL e Redis `healthy`; landing HTTP 200; HERO local pré-carregado; API readiness confirmou PostgreSQL e Redis.
- Auditoria do HTML público sem `Sparkles`, estrelas Unicode, emojis, RandomUser, “Últimas vagas” ou Wix; carrossel continua presente no código e só exibe fontes reais.

### Limite honesto
- Browser desta máquina continua bloqueando a porta 80 com `ERR_BLOCKED_BY_CLIENT`; a landing foi validada por build, healthcheck e HTTP/HTML, sem declarar interação visual browser.
