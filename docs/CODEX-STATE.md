# CODEX-STATE — VivianiCRM

> Atualizado em 2026-09-03. A evidência vigente está no último addendum deste arquivo.

## Sessão atual

- Objetivo: deixar uma apresentação funcional na VPS com Docker self-hosted, auditar o projeto inteiro e corrigir as falhas reproduzíveis.
- Mantenedora: usuário desta sessão.
- Onboarding concluído com base no código/documentação; contrato em `.Codex/PROJECT.md`.
- Gap-check inicial em `.Codex/GAP-CHECK.md`.
- Código de aplicação, configuração e infraestrutura foi alterado nesta sessão e implantado na VPS.

## Estado conhecido

- Monorepo: `apps/api`, `apps/crm`, `apps/landing`; pacotes compartilhados esperados, porém deletados no estado atual do Git.
- Git já estava sujo antes do trabalho: `.gitignore`, `PRODUCTION_SETUP.md`, `apps/api/prisma/seed.ts`, docs, lockfile e vários `packages/*` deletados/modificados.
- A documentação histórica afirma que a API Render está indisponível e que a validação anterior foi prejudicada por Node 24 e links de dependência para outra cópia.
- Nada acima foi considerado resolvido sem nova execução nesta sessão.

## Próxima ação exata

O deploy inicial e as validações foram concluídos. Em qualquer retomada, primeiro conferir o addendum abaixo e manter `FRESH_DATABASE=false`; não repetir bootstrap nem iniciar localhost.

## Regra de continuidade

Não declarar “tudo funcionando” sem evidência de API, landing e CRM no ambiente ativo, incluindo ao menos health, login/demo, leitura de dados e captura de lead. Integrações externas sem credenciais devem ser marcadas como bloqueadas, não simuladas como reais.

## Addendum — implantação self-hosted concluída

- O pedido vigente substituiu localhost/Vercel/Supabase/Render por Docker Compose na VPS `87.76.215.134`.
- Instâncias locais nas portas 3000, 3001 e 4000 foram encerradas; não há listeners locais nessas portas.
- API, CRM, Landing, Nginx, PostgreSQL 16 e Redis 7 estão ativos em `/opt/viviani-crm`.
- O banco foi criado do zero, sem migração de dados. Como o repositório não tinha migration inicial, o bootstrap fresco aplicou o schema Prisma atual e registrou as quatro migrations existentes como baseline.
- Verificado: testes 24/24, lint 7/7, `pnpm audit` sem vulnerabilidades conhecidas, build local dos três apps, health externo 200, login/troca de senha/leitura de lead no CRM e captura de lead com consentimento.
- Próximo estado seguro: manter `FRESH_DATABASE=false`; habilitar TLS/HSTS/cookies Secure somente após configurar domínio ou certificado válido.

## Addendum — redesign final e limites de apresentação

- Auditoria visual e DNA: `docs/23_DESIGN_DNA_AND_AUDIT.md`.
- Seções públicas legadas foram alinhadas à paleta editorial; não há mais efeitos decorativos de IA no caminho público.
- CRM verificado em desktop/mobile e redeployado na VPS após a última alteração.
- Landing teve resposta HTTP 200 e HTML limpo; o browser de validação local bloqueou a porta 80 com `ERR_BLOCKED_BY_CLIENT`, então não há afirmação de interação browser da landing.
- Integrações Google/SMTP/WhatsApp: implementação presente, operação externa bloqueada por credenciais ausentes; painel exibe `pendente`.
- Não reiniciar localhost, não usar `down -v`, manter `FRESH_DATABASE=false`.

## Addendum — hardening final e estado remoto verificado

- A última correção compilável foi implantada na VPS; o erro TypeScript do status OAuth foi fechado antes do redeploy.
- O proxy publica `/health`, `/health/ready` e `/health/deps`; os três endpoints retornam 200 pelo IP público.
- Webhook WhatsApp exige configuração/assinatura; OAuth Google é persistido criptografado; SMS sem Twilio falha explicitamente; reset administrativo não devolve senha.
- Evidência final: API e suíte monorepo 24/24, lint 7/7, build concluído, seis containers healthy, Nginx válido, CRM 390px/1440px sem overflow e sem erros de browser.
- Retomada segura: não iniciar localhost, não recriar volumes, não usar `down -v`, manter `FRESH_DATABASE=false`. Produção real continua pendente de domínio/TLS, credenciais externas, backup/RLS e rotação da senha root.

## Addendum — encerramento do redeploy self-hosted

- Última implantação validada em `/opt/viviani-crm` com Docker Compose; API, CRM, Landing, Nginx, PostgreSQL e Redis estão `healthy`.
- Dependências e caminhos de execução Supabase/Upstash/Vercel/Render foram removidos; uploads e Redis permanecem locais à VPS.
- Pacotes temporários de deploy foram removidos e nenhuma instância local nas portas 3000, 3001 ou 4000 está ativa.
- Não alterar `FRESH_DATABASE=false`, não usar `down -v` e não declarar produção concluída antes de TLS, credenciais externas, backup, RLS e rotação da senha root.

## Addendum — upgrade cirúrgico da landing (2026-09-01)

- A landing voltou à estrutura visual anterior, preservando HERO em imagem inteira, carrossel de avaliações, headline, sublinhado, CTAs e credenciais.
- Parallax solicitado foi mantido somente na imagem do HERO (`12%`); o conteúdo da frente não acompanha o deslocamento.
- Removidos partículas, `Sparkles`, estrelas Unicode, emojis/símbolos genéricos, urgência padrão, depoimentos artificiais e referências Wix do HTML público.
- Serviços usam ícones Lucide contextuais; assets fixos do HERO, certificação e JSON-LD são locais.
- Verificado depois do redeploy: build/lint da landing passaram, seis containers healthy, HTTP 200, asset local do HERO, readiness da API com PostgreSQL/Redis e HTML sem resíduos legados.
- Limite honesto: browser local bloqueia a porta 80 com `ERR_BLOCKED_BY_CLIENT`; interação visual da landing continua pendente nesse ambiente.

## Addendum — contrato de perfis e roles (2026-09-01)

- `COLLABORATOR` é o perfil de produto usado por PRD, UI e respostas serializadas.
- `MANAGER` é mantido somente como valor do enum persistido atual; entradas públicas com ambos os nomes passam por `normalizeUserRole` e têm o mesmo conjunto de permissões.
- API de usuários, NextAuth/CRM e JWT compartilham essa fronteira; a cobertura está em `apps/api/src/lib/access-roles.spec.ts`.
- Não houve alteração de enum nem migração de dados na VPS. Uma troca futura exige migration reversível e aprovação explícita de schema.

## Addendum — falha honesta de métricas (2026-09-01)

- O dashboard deixou de converter falhas de consulta em sucesso com números zerados.
- As consultas agora propagam a falha para as rotas, que respondem `503` com mensagem operacional; zero continua significando banco funcionando sem registros.

## Addendum — preservação do histórico operacional (2026-09-01)

- Corrigido no código: `DELETE` de leads e lançamentos agora arquiva com `deleted_at`; consultas operacionais ignoram arquivados.
- Corrigido no código: edição financeira cria uma substituição e arquiva a versão anterior; não sobrescreve o lançamento original.
- Corrigido no código: exclusão de agendamento cancela, remove o evento do Google e preserva a linha; a ação gera auditoria.
- Cobertura adicionada: testes de comportamento de lead, financeiro e agenda; a suíte da API passou com 33 testes.
- A migration reversível `apps/api/prisma/migrations/20260901090000_preserve_operational_history/` foi aplicada na VPS após autorização explícita de schema. `deleted_at` foi confirmado em `leads` e `financials`, sem migração de dados.
- Pós-deploy confirmado: seis containers `healthy`, `/health`, `/health/ready`, `/health/deps`, landing, login do CRM e API direta retornam 200; seed idempotente preservou as contagens existentes (`leads_active=1`, `financials_active=0`, `appointments=0`).
- Validação local final: lint 7/7 e suíte monorepo com 33 testes de API aprovados. Limite mantido: interação visual browser da landing continua não verificada por `ERR_BLOCKED_BY_CLIENT`.

## Addendum — mapa SLC e gate final (2026-09-03)

- Documento vinculante: `docs/25_MAPA_HOMOLOGACAO_PRODUCAO_100_2026-09-03.md`, seção 23.
- A última publicação da landing/Nginx foi validada na VPS; seis containers estão `healthy`, `nginx -t` passou, `/health` e `/health/ready` retornaram 200 e o backup `20260903T200153Z` passou em SHA-256 para banco e uploads.
- API: 48/48 testes; cobertura executável 48/48 com 24,11% de linhas; lint 7/7; build completo aprovado; Playwright/Brave: 10 pass, 2 skipped por credenciais externas ausentes.
- RLS foi aplicada em 16 tabelas com policies single-tenant; isso não é isolamento multi-tenant. A role `viviani_app` foi confirmada sem superuser/bypassrls.
- Homologação controlada está aprovada para apresentação com dados sintéticos. Produção permanece bloqueada por TLS/perímetro, rotação, backup externo/restore, integrações, E2E completo, downloads, observabilidade e aceite.
- Não iniciar localhost, não usar `docker compose down -v`, manter `FRESH_DATABASE=false` e não inserir dados reais antes do fechamento dos P0/P1.

## Addendum — perímetro atrás do Nginx (2026-09-03)

- API e CRM não publicam mais portas próprias no Docker Compose; o Nginx é o único serviço com portas públicas e faz proxy para `:3001` e `:4000`, preservando os URLs da apresentação.
- PostgreSQL e Redis continuam sem publicação externa. O fechamento foi validado com `nginx -t`, health/readiness e suíte Brave; produção ainda exige TLS/domínio, firewall e tráfego concentrado em HTTPS/443.

## Addendum — validação pós-perímetro (2026-09-03 20:11 UTC)

- O proxy foi validado em funcionamento: API/CRM sem publicação própria, Nginx como único serviço público em `80/3001/4000`.
- Health, readiness, login, teste negativo com rate limit/request ID e suíte Brave (`10 pass`, `2 skipped`) passaram após a mudança.
- Backup `20260903T201117Z` íntegro por SHA-256. Não iniciar dados reais: domínio/TLS, rotação, backup externo/restore, integrações e aceite continuam pendentes.

## Addendum — guard de promoção por estágio (2026-09-03)

- `DEPLOYMENT_STAGE` foi adicionado ao contrato do Compose/API; o health expõe `stage` para diferenciar homologação de `NODE_ENV=production`.
- `deploy/vps/preflight.sh` impede promoção para production sem HTTPS em hostname DNS, cookies Secure, HSTS, segredos reais, backup externo confirmado e seed desligado.
- A VPS continua intencionalmente em homologação; não marcar `BACKUP_EXTERNAL_CONFIRMED=true` antes de cópia externa e restore isolado comprovados.

## Addendum — performance de imagens da landing (2026-09-01)

- O HERO foi convertido de JPEG original de 6 MB para WebP local de 44 KB, com placeholder blur imediato.
- O `next/image` deixou de priorizar AVIF e não gera mais variantes acima de 1920 px; o primeiro request frio medido na VPS foi aproximadamente 0,4 s, retornando `image/webp`.
- Landing recriada na VPS sem tocar em banco, Redis, API ou CRM; health, readiness, deps, landing e login continuam 200.

### Addendum — acesso da Viviani por username (2026-09-01)

- A conta ADMIN existente de Viviani Serena foi reutilizada; não foi criada uma conta duplicada nem houve migração de dados operacionais.
- A migration reversível `20260901110000_add_usernames` adiciona `users.username` nullable/unique e mantém contas legadas somente com e-mail compatíveis.
- O login do API e do CRM aceita username ou e-mail; o username é normalizado para minúsculas, então `viviani`, `VIVIANI` e `ViViaNI` apontam para a mesma conta.
- A credencial temporária foi aplicada à conta `viviani` na VPS, com `mustChangePassword=true`; a primeira sessão encaminha para `/definir-senha`.
- Verificado na VPS: migration up to date, conta ADMIN única, login misto HTTP 200, username retornado e troca obrigatória ativa; e-mail antigo também continua funcionando.

### Addendum — correção do callback autenticado atrás do Nginx (2026-09-03 20:31 UTC)

- O primeiro login válido após o perímetro falhou porque o callback do NextAuth devolvia `502 text/html`; o log do Nginx apontou cabeçalho de resposta acima do buffer padrão.
- Aumentados os buffers de cabeçalho/resposta em `deploy/docker/nginx.conf`; o Nginx foi recriado para carregar o arquivo montado, sem remover volumes.
- Validação: callback e sessão `200`, dashboard carregado e teste Playwright autenticado passou. O teste recebeu timeout de URL de 15 s para cobrir a latência real da VPS.
- Não marcar produção como pronta: os gates de TLS/domínio, rotação, backup externo/restore, integrações, cobertura CRM completa, downloads, observabilidade e aceite continuam abertos.

### Addendum — navegação autenticada do portal principal (2026-09-03 20:35 UTC)

- Dez rotas do CRM foram percorridas em desktop e viewport móvel com autenticação real, todas `200`, sem erros de página, respostas `4xx/5xx` ou overflow horizontal.
- O percurso foi somente leitura e não alterou registros.
- Mutações, exports/downloads, testes negativos de autorização por perfil e integrações externas ainda precisam de ensaio controlado.

### Addendum — fechamento técnico da rodada (2026-09-03)

- `pnpm test`: 48/48 testes de API aprovados; `pnpm lint`: 7/7 pacotes aprovados; `pnpm build`: build completo aprovado.
- `pnpm audit --prod --json`: zero vulnerabilidades após Playwright `1.62.1` e axe `4.13.0`.
- Brave contra a VPS: 10 pass, 2 skipped no runner sem credenciais; login autenticado e navegação CRM foram validados separadamente. A suíte pública foi repetida após a atualização das ferramentas.
- `caniuse-lite` foi atualizado para `1.0.30001810`; o build final ficou sem o aviso do Browserslist.
- Produção ainda não está liberada: TLS/domínio, rotação, backup externo/restore, integrações, downloads, observabilidade e aceite seguem pendentes.

### Addendum — atualização controlada das ferramentas de validação (2026-09-03)

- `@playwright/test` foi atualizado para `1.62.1`, `@axe-core/playwright` para `4.13.0`; `caniuse-lite 1.0.30001810` e `baseline-browser-mapping 2.11.21` ficaram fixados no package/lockfile para o Docker reproduzir o mesmo build.
- Pós-atualização: `pnpm test` 48/48, `pnpm lint` 7/7, `pnpm exec turbo run build --force` completo e Brave 10 pass/2 skipped por credenciais ausentes.
- O build forçado não emitiu Browserslist warning; o rebuild remoto instalou as mesmas versões fixadas.
- `pnpm audit --prod --json` permaneceu sem vulnerabilidades. Permanecem avisos de obsolescência em `multer`, ESLint e 11 subdependências; upgrades adicionais ficam para janela isolada.

### Addendum — revalidação final da homologação (2026-09-03)

- Lockfile final sincronizado na VPS; imagens de API, CRM e landing reconstruídas com instalação congelada. O build remoto não emitiu Browserslist warning.
- Um smoke executado durante a subida encontrou o Nginx ainda `starting`; após o healthcheck ficar `healthy`, a repetição passou. Não houve perda de volume nem alteração de banco.
- Preflight e smoke finais passaram em `homologacao`; seis serviços saudáveis e API/CRM sem bindings públicos próprios.
- Brave repetido após o rebuild: 10 pass, 2 skipped condicionais por credenciais ausentes; `pnpm audit --prod --json` sem vulnerabilidades.
- Homologação controlada apta para apresentação; produção real continua bloqueada pelos gates externos listados no mapa.

### Addendum — perfil HTTPS e gates de promoção (2026-09-03)

- O perfil `deploy/docker/docker-compose.production.yml` limita a publicação do Nginx a `80/443`; API e CRM permanecem somente na rede Docker.
- O Nginx de produção termina TLS, redireciona HTTP, aplica HSTS e usa hosts distintos para landing, CRM e API. Certificados reais são ponto de montagem privado em `deploy/vps/tls` e não entram no Git.
- O preflight passou a impedir Compose base sem o override, URLs sem HTTPS/DNS ou divergentes dos hosts do Nginx, além de exigir confirmações de firewall, rotação de SSH/root e rotação de segredos.
- Ensaio remoto isolado passou no preflight de produção, no `docker compose config` com somente `80/443` e no `nginx -t` com TLS de teste; a instância ativa continua em homologação e não recebeu certificado de teste.
- Revalidação da instância ativa passou como `homologacao`, com seis serviços `healthy`, `nginx -t`, health e readiness aprovados; o teste sem o override HTTPS foi recusado pelo preflight.
- Produção continua bloqueada até domínio/certificado real, firewall aplicado, rotação comprovada, backup externo/restore, integrações transacionais, carga, observabilidade e aceite.

### Addendum — correção de Nginx defasado na VPS (2026-09-03)

- A verificação final encontrou um `nginx.conf` antigo carregado na VPS, com redirect HTTPS como servidor padrão; o health por IP devolvia `308`.
- O arquivo homologação foi sincronizado e somente o Nginx foi recriado com `--force-recreate`, sem remover volumes ou recriar os serviços de dados.
- Após a correção, `nginx -t`, `/health`, `/login`, `/health/ready` e o estado dos seis serviços passaram; a etapa de reload/recreate ficou registrada como obrigatória no runbook.

### Addendum — backup e restore isolado (2026-09-03)

- O restore drill encontrou e corrigiu a ordem da role `viviani_app`: ela agora é garantida antes e depois da importação; o manifesto SHA-256 é validado antes da operação destrutiva.
- Último dump restaurado em PostgreSQL temporário com 17 tabelas; uploads extraídos sem arquivos porque a homologação não tem mídia cadastrada. O volume ativo não foi tocado.
- `backup.sh` agora gera checksums relativos, usa `umask 077` e valida cópia para `BACKUP_EXTERNAL_DIR`; o ensaio temporário confirmou três artefatos locais e três externos.
- `viviani-crm-backup.service` e `.timer` passaram no `systemd-analyze verify`; o unit usa `/bin/sh` para não depender de bit executável após SCP e ainda não foi ativado na VPS.
- Produção continua sem confirmação externa até existir volume/storage real, criptografia, retenção automatizada e drill aprovado.

### Addendum — smoke operacional pós-deploy (2026-09-03)

- `deploy/vps/operational-smoke.sh` foi adicionado e executado com sucesso na homologação: seis serviços saudáveis, Nginx válido, endpoints públicos acessíveis e API/CRM sem bindings próprios.
- O smoke deve acompanhar todo deploy/reload; monitoramento e alertas externos ainda não estão ativos.

### Addendum — hardening final, E2E autenticado e HML revalidada (2026-09-03)

- A CSP da landing deixou de permitir `unsafe-eval`; o endpoint autenticado de auto-templates agora propaga falha ao handler em vez de responder lista vazia; erros de appointments usam logger estruturado.
- Conteúdo público de bio passa por sanitização de texto e a renderização rica da landing usa allowlist de tags e protocolos de link, sem HTML bruto não controlado.
- Evidência local atual: `pnpm test` 61/61 em 19 arquivos, cobertura executável 32,85% de linhas, `pnpm lint` 7/7 e build completo aprovado. A última auditoria de dependências de produção concluída retornou zero vulnerabilidades; não houve alteração de dependências nesta correção.
- Os testes de rota cobrem username case-insensitive, 2FA por e-mail, troca de senha, criação/reset de usuário sem vazamento de senha temporária, autoexclusão administrativa, sanitização pública de bio e templates automáticos.
- Brave controlado contra a VPS: suíte pública 10 pass/2 skipped; CRM autenticado 3/3 no desktop e 3/3 no mobile, com dez rotas, ausência de overflow/erros HTTP de API e downloads físicos de leads, financeiro, disparos e segurança.
- A conta QA efêmera foi removida ao fim do ensaio. Na VPS, preflight e smoke passam em `homologacao`, seis serviços estão saudáveis, CSP pública não contém `unsafe-eval`, auto-templates sem sessão retorna `401` e não há listeners locais nem usuários `qa_` remanescentes.
- Produção permanece bloqueada: domínio/TLS/443, firewall e rotação, backup externo com retenção e restore aceito, integrações reais, isolamento formal, testes de mutação/permissão/2FA, carga/observabilidade, LGPD e aceite continuam sem evidência suficiente.
