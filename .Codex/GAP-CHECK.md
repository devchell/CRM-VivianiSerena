# GAP-CHECK — VivianiCRM

> Revisão inicial do contrato em 2026-08-31; última validação registrada em 2026-09-03. O fechamento mais recente está na última seção e não constitui aprovação automática de produção.

## Domínio não omitido

O pedido cobre o produto inteiro, mas o domínio inclui: usuários, papéis, permissões, leads, consentimentos, sessões, analytics, vitals, agenda, serviços, financeiro, conteúdo, versões, templates, uploads, auditoria, segurança, notificações, e-mail, Google, WhatsApp, storage, Redis, banco, deploy e backups.

## Eixos

| Eixo            | Estado   | Lacuna objetiva                                                                                                             |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Dados           | FALTANDO | Base legal e retenção não estão completas para usuários, agenda, financeiro, conteúdo, storage e integrações.               |
| Autorização     | FALTANDO | Docs dizem COLLABORATOR; schema e código usam MANAGER em pontos importantes. RLS real ainda não foi comprovada.             |
| Falha           | FALTANDO | API, banco, Redis, e-mail, Google e WhatsApp precisam de testes de indisponibilidade e feedback honesto na UI.              |
| Concorrência    | FALTANDO | Edição de conteúdo, financeiro, leads, dispatches e publicação não têm validação end-to-end de corrida/idempotência.        |
| Volume          | FALTANDO | Listagens/exportações/disparos precisam de paginação, limites e comportamento 100x validado.                                |
| Migração        | FALTANDO | Há migrations Prisma sem procedimento reversível documentado; estado do banco local/remoto não foi verificado nesta sessão. |
| Reversão        | FALTANDO | Não há rollback demonstrado para código, migrations, publicação e configurações.                                            |
| Observabilidade | FALTANDO | Há logs/health endpoints, mas ainda não foram executados nesta sessão nem ligados a alerta real.                            |
| Custo           | FALTANDO | Render/Vercel/Supabase/Upstash e envio de mensagens/e-mail não têm limites operacionais confirmados.                        |
| Compliance      | FALTANDO | Classificação crítica; responsável, bases legais e retenções precisam de confirmação formal.                                |

## Bloqueantes

1. O ambiente de dependências está suspeito: o relatório anterior registrou `node_modules` apontando para outra cópia e erro `EPERM`; sem runtime reproduzível não há evidência de funcionamento.
2. Os pacotes compartilhados aparecem deletados no Git (`packages/config`, `types`, `ui`, `utils`), enquanto os apps ainda os importam; build/teste pode estar estruturalmente quebrado.
3. A API depende de Postgres e Redis; sem uma configuração local segura não há CRM completo nem captura persistida para demonstrar.
4. A divergência de papel `COLLABORATOR`/`MANAGER` pode causar autorização incorreta e precisa de decisão técnica baseada no comportamento desejado.
5. Segredos e artefatos locais já foram apontados como risco histórico; é necessário revisar rastreamento e não expor valores ao relatório.

## Dívida aceitável, se explicitamente sinalizada

- Integrações reais de Google, WhatsApp e SMTP sem credenciais, desde que o painel mostre `pendente` e não declare sucesso.
- Observabilidade externa, WAF, backup offline e E2E completo, se não bloquearem a apresentação local e permanecerem documentados.
- Domínio/DNS de produção e deploy Render, que não são equivalentes a localhost funcional.

## Fora de escopo deliberado

- Criar contas ou alterar produção sem autorização específica.
- Usar dados pessoais reais da cliente na apresentação.
- Apagar alterações locais preexistentes ou restaurar deleções sem comparar com o estado desejado.

## Próxima verificação

Inspecionar Node/pnpm, links de `node_modules`, lockfile e estado dos pacotes; então executar lint, tipos, testes, builds, health checks e os fluxos reais dos três apps. Cada falha reproduzível deve voltar para este arquivo com status `corrigido`, `não corrigido` ou `bloqueado`.

## Resultado da auditoria e implantação — 2026-08-31

| Eixo            | Resultado                      | Evidência / pendência                                                                                                                                              |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dados           | CORRIGIDO PARA DEMO            | PostgreSQL 16 novo em volume Docker; seed idempotente sem delete; 2 usuarios e 1 lead de demonstração persistidos.                                                 |
| Autorização     | PARCIAL                        | Login, troca de senha inicial e leitura autenticada verificados. Divergência documental `COLLABORATOR`/`MANAGER` e RLS ausente nas migrations continuam pendentes. |
| Falha           | CORRIGIDO NO CAMINHO PRINCIPAL | Health API/DB/Redis/uploads 200; erros opcionais deixaram de ser silenciosos. Integrações externas sem credenciais permanecem bloqueadas.                          |
| Concorrência    | PARCIAL                        | Idempotência do seed e do dispatch preservadas; corridas end-to-end não foram demonstradas.                                                                        |
| Volume          | PARCIAL                        | Limites de entrada e paginação existentes; carga alta não foi executada.                                                                                           |
| Migração        | CORRIGIDO PARA BANCO FRESCO    | Bootstrap aplicado do zero e migrations existentes marcadas como baseline. Não foi feita migração de dados.                                                        |
| Reversão        | PARCIAL                        | Rebuild/rollback de aplicação documentado; rollback de schema continua manual e não foi exercitado.                                                                |
| Observabilidade | PARCIAL                        | Logs persistentes, healthchecks e restart policy ativos; nenhum alerta externo configurado.                                                                        |
| Custo           | CORRIGIDO NO AMBIENTE          | Sem Vercel, Supabase, Render ou Upstash; custo fica restrito à VPS e integrações opcionais.                                                                        |
| Compliance      | PARCIAL                        | Consentimento no cliente/API, anonimização e páginas informativas ajustados; revisão jurídica, retenção formal e RLS ainda pendentes.                              |

### Bloqueios restantes antes de produção

1. Acesso atual é HTTP por IP; credenciais/cookies devem migrar para HTTPS com domínio/certificado e `COOKIE_SECURE=true`.
2. Não existe backup externo automatizado no Compose (`BACKUP_ENABLED=false`); não tratar o volume local como backup.
3. Não há policies RLS nas migrations; o banco permanece privado na rede Docker, mas precisa de hardening/validação SQL antes de expor acesso direto.
4. SMTP, Google Calendar e WhatsApp não foram configurados; esses fluxos não podem ser apresentados como integrações reais.
5. Migration reversível de soft-delete/cancelamento aplicada na VPS; `deleted_at` e `_prisma_migrations` confirmados, seis containers healthy e contagens operacionais preservadas. Rollback ainda é manual e não foi exercitado.

## Auditoria visual e publicação final — 2026-08-31

| Item                                              | Status                                    | Evidência                                                                                                                                                                           |
| ------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing e CRM sem linguagem visual genérica de IA | CORRIGIDO NO CAMINHO VALIDADO             | Removidos Sparkles, estrelas decorativas, emojis de interface, partículas, 3D, blur e gradientes ornamentais; parallax ficou restrito ao background do HERO.                        |
| Responsividade                                    | CORRIGIDO NO CRM VALIDADO                 | Browser em 390px sem overflow; sidebar desktop ausente; drawer mobile abre; desktop 1440px validado. Landing teve HTML 200, mas interação browser foi bloqueada pelo cliente local. |
| Fluxos principais da apresentação                 | CORRIGIDO PARA DEMO                       | Login/troca de senha, dashboard, leads, agenda, financeiro, CMS, segurança, administração e modais percorridos no CRM sem erro de browser observado.                                |
| Banco, Redis e API                                | CORRIGIDO PARA DEMO                       | Docker Compose ativo na VPS; health live/ready/deps e consulta de conteúdo retornam 200.                                                                                            |
| Google Calendar, SMTP e WhatsApp                  | IMPLEMENTADO / BLOQUEADO POR CONFIGURAÇÃO | Código e painel existem; VPS não possui credenciais/autorização, logo envio/OAuth/webhook real não foi declarado nem testado.                                                       |
| Produção real                                     | NÃO CONCLUÍDO                             | Acesso ainda é HTTP por IP; faltam domínio/TLS, backup externo, RLS validada e hardening operacional.                                                                               |

### Gap-check pós-correção

- Não há falha reproduzível adicional no caminho da apresentação depois do redeploy final.
- O status “bloqueado” das integrações externas é dependência de credencial/conta, não falha silenciosa do código.
- O objetivo de produção completa permanece aberto até o responsável fornecer/configurar as credenciais externas e domínio/TLS, além de aprovar hardening de dados.

## Fechamento da rodada de correções — 2026-08-31 / 2026-09-01 UTC

| Achado                                                            | Resultado                   | Evidência                                                                                               |
| ----------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| Health checks não publicados pelo proxy                           | CORRIGIDO                   | Nginx encaminha `/health/ready` e `/health/deps`; ambos retornam 200 externamente.                      |
| Webhook WhatsApp aceitava configuração ausente/assinatura ausente | CORRIGIDO                   | configuração ausente 503; request público sem assinatura 503; suíte cobre assinatura válida e inválida. |
| Token OAuth Google em Redis sem proteção                          | CORRIGIDO PARA NOVOS TOKENS | persistência usa `EncryptionService`; teste valida decrypt e preservação do refresh token.              |
| SMS simulava sucesso sem Twilio                                   | CORRIGIDO                   | ausência de configuração retorna falha explícita.                                                       |
| Resposta de reset expunha segredo baseline                        | CORRIGIDO                   | senha removida da resposta da rota administrativa.                                                      |
| Interpolação de templates HTML podia inserir conteúdo sem escape  | CORRIGIDO                   | valores interpolados são escapados no caminho HTML; testes de dispatch passam.                          |
| Detector marcou depoimento artificial                             | FALSO POSITIVO              | “Maria Silva” encontrado somente em `placeholder` do formulário.                                        |
| Falha de compilação após hardening Google                         | CORRIGIDO                   | guard explícito; build completo aprovado.                                                               |

### Evidência final de apresentação

- API: 24/24 testes; monorepo: 24/24 testes; lint: 7/7; build concluído.
- VPS: API, CRM, Landing, Nginx, PostgreSQL e Redis `healthy`; `nginx -t` aprovado.
- Browser CRM: rotas autenticadas percorridas em 390px sem overflow e dashboard em 1440px sem overflow; erros de página vazios.
- Limite que permanece: credenciais externas, domínio/TLS, backup externo, RLS e hardening operacional não podem ser inventados nem declarados como concluídos.

### Fechamento do gap de infraestrutura cloud — 2026-08-31 / 2026-09-01 UTC

- Corrigido: runtime cloud legado removido do código executado; Redis e uploads usam serviços locais da VPS.
- Corrigido: arquivos e workflow de deploy cloud removidos; Compose self-hosted é o caminho oficial.
- Verificado: redeploy final com seis containers saudáveis, Nginx válido, endpoints públicos 200 e contratos negativos preservados.
- Ainda aberto: credenciais/autorização reais de Google Calendar, SMTP e WhatsApp; domínio/TLS, backup externo, RLS e hardening operacional.

## Correção visual solicitada pelo responsável — 2026-09-01

| Achado                                                          | Resultado | Evidência                                                                                                               |
| --------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Landing havia sido reduzida a uma composição editorial genérica | CORRIGIDO | Estrutura visual anterior restaurada, incluindo HERO em imagem inteira e carrossel.                                     |
| HERO precisava manter o parallax do background                  | CORRIGIDO | `Hero.tsx` usa `useScroll/useTransform` somente na imagem, com deslocamento de 12%; conteúdo fica no fluxo normal.      |

## QA funcional aprofundado — 2026-09-01 UTC

| Achado | Resultado | Evidência |
| --- | --- | --- |
| Aliases `resultados` e `depoimentos` causavam 500 no conteúdo | CORRIGIDO | Normalização para enums Prisma adicionada; leituras autenticadas retornam 200 e seção inexistente retorna 404. |
| Atualização de conteúdo aceitava corpo sem `value` | CORRIGIDO | Schema passou a exigir a propriedade; request negativo retorna 400 e o título original do HERO foi confirmado/restaurado. |
| CSV revogava `ObjectURL` imediatamente | CORRIGIDO | Revogação postergada nos exportadores de leads, disparos e financeiro para não interromper downloads em navegadores. |
| Rate limit global durante auditoria repetitiva | COMPORTAMENTO CONHECIDO | Limite de 100 requisições/15 min protege a API; após reinício da janela, as 10 rotas desktop e mobile passaram sem erro. UX específica para 429 permanece melhoria futura. |
| QA pós-deploy | APROVADO PARA DEMO | 40/40 leituras da API; 11/11 mutações inválidas rejeitadas/controladas; 10/10 telas desktop e mobile sem erro visível; seis serviços healthy. |
| Elementos com aparência de IA                                   | CORRIGIDO | Removidos canvas de partículas, `Sparkles`, estrela Unicode, emojis/símbolos de serviço, FOMO padrão e hover roxo/rosa. |
| Depoimentos artificiais reapareceram com a restauração          | CORRIGIDO | `Testimonials.tsx` mescla somente itens manuais/Google reais e retorna vazio quando não há conteúdo.                    |
| Dependências visuais externas legadas                           | CORRIGIDO | Fallback do HERO, selo e imagem do JSON-LD apontam para `/public`; referências Wix não aparecem no HTML público.        |

### Evidência pós-redeploy

- `pnpm --filter @viviani/landing lint`: passou.
- `pnpm --filter @viviani/landing build`: passou.
- VPS: seis containers `healthy`; `landing_http=200`; HTML pré-carrega `/images/viviani/retrato.webp`; health público `ok`; API readiness `ready` com banco e Redis verdadeiros.

## Correção de carregamento de imagens — 2026-09-01

| Achado                                                                                                     | Resultado | Evidência                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| HERO original tinha 6 MB e 5472×3648; primeira resposta podia deixar o fundo cinza durante o processamento | CORRIGIDO | Asset WebP local de 44 KB, placeholder blur imediato e `quality=78`.                                                                        |
| Next priorizava AVIF e gerava variantes até 3840 px                                                        | CORRIGIDO | Runtime limitado a 1920 px e WebP priorizado; request frio do HERO em 1920 px medido em aproximadamente 0,4 s e `Content-Type: image/webp`. |

- Auditoria por texto no bundle/HTML: sem `Sparkles`, estrelas Unicode, emojis decorativos, RandomUser, “Últimas vagas” ou referência Wix.
- Limite: browser desta máquina continua bloqueando a porta 80 com `ERR_BLOCKED_BY_CLIENT`; a landing foi validada por build, HTTP/HTML e healthcheck, não por interação visual neste browser.

## Fronteira de perfis e roles — 2026-09-01

| Achado                                                                        | Resultado                         | Evidência                                                                                                                                                                           |
| ----------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentação/UI usavam `COLLABORATOR`, enquanto o enum Prisma usava `MANAGER` | CORRIGIDO COMO CONTRATO EXPLÍCITO | `UserProfile` é o vocabulário público; `UserRole` documenta o enum persistido; `USER_ROLE_INPUTS` aceita ambos e `normalizeUserRole` converte para `MANAGER` antes da persistência. |
| Autenticação podia carregar role legado sem normalização central              | CORRIGIDO                         | API de usuários, NextAuth/CRM e verificação do JWT usam a mesma normalização; perfil exibido continua `COLLABORATOR`.                                                               |
| Troca física do enum do banco                                                 | NÃO EXECUTADA POR SEGURANÇA       | Exigiria migration reversível e aprovação de schema; a VPS está com dados de demonstração ativos e não há motivo para uma alteração destrutiva nesta rodada.                        |

### Teste da correção

- `apps/api/src/lib/access-roles.spec.ts`: cobre persistência do perfil, normalização de `COLLABORATOR`/`MANAGER`, inferência do perfil e permissões de colaborador.

## Falha honesta do dashboard — 2026-09-01

| Achado                                                  | Resultado | Evidência                                                                                                             |
| ------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| Falhas de consulta eram convertidas em métricas zeradas | CORRIGIDO | `getMetricsOverview` não usa mais `safeGet*`; erro de dependência propaga para a rota.                                |
| Usuário recebia erro técnico genérico                   | CORRIGIDO | `/metrics/overview` e `/dashboard/stats` retornam `503` com mensagem operacional; erros de validação continuam `400`. |

## Sessão: 2026-09-01 — username e senha temporária da Viviani

### Ações

- Adicionada migration reversível `20260901110000_add_usernames`, com coluna nullable e índice unique para não quebrar contas existentes.
- API e CRM passaram a aceitar username ou e-mail; o identificador é normalizado para minúsculas antes da busca.
- A conta ADMIN existente foi reutilizada com username `viviani`; o e-mail técnico foi preservado para integrações de autenticação existentes.
- A senha solicitada foi aplicada sem ser registrada em código, com `must_change_password=true`; a tela de troca agora informa que a senha foi fornecida pelo administrador.

### Evidências

- Local: types build, API build, CRM build, API lint, CRM lint e 34 testes da API passaram.
- VPS: migration status sem pendências; usuário ADMIN único; login com identificador em caixa mista e com e-mail retornou HTTP 200, username normalizado e troca obrigatória.
- VPS: API, CRM, Landing, Nginx, PostgreSQL e Redis continuam `healthy`; health da API retornou 200.

### Pendências honestas

- A senha temporária deve ser trocada pela Viviani no primeiro acesso; ela não foi impressa em logs nem nesta documentação.
- A apresentação continua em HTTP por IP, sem TLS/domínio; credenciais externas, backup externo, RLS e rotação da senha root permanecem pendentes.

## Auditoria completa SLC — 2026-09-03

- Relatório completo criado em `docs/24_AUDITORIA_COMPLETA_SLC_2026-09-03.md`.
- Evidência atual: API 43/43 testes, builds/lint dos três apps, health remoto, login CRM, matriz API 40/40, negativos 11/11, CRM 10/10 rotas desktop e 10/10 mobile sem overflow/erro visível.
- Bloqueios confirmados: HTTP sem TLS, root não rotacionado, portas API/CRM públicas, backup externo ausente, SMTP rejeitando credencial, dependências com quatro advisories, sanitização HTML incompleta, senha temporária no JSON, RLS não comprovada e ausência de E2E/a11y automatizados.
- Achado visual novo: hover 3D ainda ativo em `apps/landing/src/components/Services.tsx`; remover antes de considerar o redesign coerente com a direção editorial sem efeitos de IA.
- Limitações preservadas: Deep Security Scan não iniciou por falta de perfil de filesystem gerenciado; TAC indisponível; landing mobile e download físico não foram comprovados nesta rodada.
- Próxima ação: executar as correções da Fase 5 do relatório, começando por perímetro/TLS/backup, e repetir a auditoria antes de dados reais.

## Remediação SLC executada — 2026-09-03

| Frente | Resultado atual | Evidência |
| --- | --- | --- |
| Dependências de produção | CORRIGIDO | `pnpm audit --prod --json`: 0 info, 0 low, 0 moderate, 0 high, 0 critical. |
| Rate limit e brute force | CORRIGIDO | Rate limit global/auth e bloqueio de login usam Redis compartilhado; headers `RateLimit-*` presentes no endpoint público. |
| HTML rico e templates | CORRIGIDO | Allowlist centralizada em `apps/api/src/lib/sanitize.ts`; testes de XSS e links perigosos passam. |
| Senha temporária | CORRIGIDO | Não retorna mais no JSON; entrega prevista somente pelo e-mail configurado, sem caminho de resposta inseguro. |
| Banco runtime | CORRIGIDO | Role `viviani_app` sem privilégios administrativos criada na VPS; migrações continuam usando conexão administrativa separada. |
| Bootstrap e backup | CORRIGIDO PARA HOMOLOGAÇÃO | Bootstrap destrutivo bloqueado por padrão; backup PostgreSQL/uploads com manifesto SHA-256 e retenção de 14 dias; integridade verificada. |
| Cabeçalhos e trust proxy | CORRIGIDO | CSP, frame policy do CRM, headers de segurança e `TRUST_PROXY=false` aplicados; CSP do CRM inclui HTTP e WebSocket da API. |
| UI/UX | CORRIGIDO | Labels/IDs, `aria-label`, funnel vazio orientativo, reduced motion, remoção de hover 3D e correção do menu mobile duplicado. |
| Deploy Docker | APROVADO PARA HOMOLOGAÇÃO | API, CRM, landing, Nginx, PostgreSQL e Redis healthy; `/health` e `/health/ready` 200; migrações sem pendências. |
| Brave desktop/mobile | APROVADO PARA HOMOLOGAÇÃO | Landing visual validada em desktop e 390x844; sem overflow; imagem do HERO completa; menu mobile sem duplicação; console sem erros/warnings. |

### Pendências que permanecem bloqueadoras para produção

- TLS/domínio e redirecionamento HTTPS;
- rotação da credencial root/SSH já utilizada para a VPS;
- fechar exposição direta das portas 4000/3001 após definir o perímetro de acesso;
- SMTP real, Google Calendar, WhatsApp e publicação externa com credenciais e eventos reais;
- cópia de backup fora da VPS e ensaio controlado de restore;
- prova formal de RLS/isolamento por tenant, se o produto continuar multi-tenant;
- suíte Playwright/a11y automatizada e comprovação de downloads físicos;
- não inserir dados reais até os gates acima serem fechados.

## Atualização final do gap-check — 2026-09-03 20:01 UTC

| Eixo | Estado final | Evidência / limite |
|---|---|---|
| Dados | PARCIAL | Banco novo e sintético em Docker; não há migração de dados; LGPD/retensão formal ainda pendentes. |
| Autorização | PARCIAL | Roles normalizadas; runtime `viviani_app` sem privilégio administrativo; RLS em 16 tabelas com policy single-tenant allow-all, sem isolamento entre tenants. |
| Falha | CORRIGIDO NO CAMINHO VALIDADO | Erros, request ID, health/readiness, rate limit e integrações ausentes possuem retorno explícito; falhas externas reais ainda não foram transacionadas. |
| Concorrência | PARCIAL | Proteções e idempotência existentes; corrida end-to-end representativa não foi executada. |
| Volume | PARCIAL | Paginação/limites presentes; carga representativa e exports físicos não foram fechados. |
| Migração | CORRIGIDO | Migration single-tenant aplicada na VPS; quatro rollbacks adicionados; execução de rollback ainda não foi feita no banco ativo. |
| Reversão | PARCIAL | Rollback de código/infra e scripts existem; drill de restore/rollback isolado ainda falta. |
| Observabilidade | PARCIAL | Seis serviços healthy, logs e health verificados; alerta externo/SLO não comprovados. |
| Custo | CORRIGIDO PARA SELF-HOSTED | Caminhos Vercel/Supabase/Render/Upstash não são usados pelo ambiente oficial; custos de VPS/integradores ainda precisam de acompanhamento. |
| Compliance | BLOQUEADO PARA PRODUÇÃO | Consentimento e páginas informativas existem; bases legais, retenção, aceite e fluxo formal de direitos ainda não foram aprovados. |

### Decisão do gap-check

- **Homologação controlada:** aprovada com restrições para apresentação, usando dados sintéticos e supervisão.
- **Produção real:** bloqueada por TLS/perímetro, rotação de segredos, backup externo/restore, integrações reais, cobertura/E2E completo, downloads, observabilidade e aceite.
- O scanner de segurança especializado não foi considerado executado: a limitação de ambiente permanece e não pode ser convertida em “passou”.
- Os artefatos gerados por cobertura e Playwright são saídas de teste, não evidência de aprovação de produção nem devem conter credenciais.

## Fechamento parcial do perímetro — 2026-09-03

- API e CRM deixaram de publicar portas próprias no Compose; ambos permanecem acessíveis na apresentação pelas portas antigas, agora terminadas no Nginx.
- O Nginx é o único serviço com portas publicadas (`80`, `3001`, `4000`); PostgreSQL e Redis continuam privados na rede Docker.
- Verificação obrigatória após ativação: `nginx -t`, seis serviços `healthy`, `/health`, `/health/ready`, `/login` e o runner Brave desktop/mobile.
- Limite: não é o perímetro final de produção porque ainda não há domínio/TLS, redirect HTTPS, firewall de produção nem concentração em 443.

## Evidência pós-ativação do perímetro — 2026-09-03 20:11 UTC

- `api` e `crm` permanecem sem `HostConfig.PortBindings`; somente o Nginx publica `80/3001/4000`.
- `nginx -t` passou; seis containers estão `healthy`; landing, login e readiness retornaram `200`.
- O teste negativo de lead através do proxy retornou `400` com `RateLimit-*` e `X-Request-Id`.
- A suíte Brave continuou verde: 10 pass, 2 skipped por credenciais de teste ausentes.
- Backup `20260903T201117Z` passou em SHA-256 para banco e uploads.
- **Estado:** PROD-02 fechado para homologação; produção continua bloqueada até domínio/TLS, firewall e concentração do tráfego em HTTPS/443.

## Guard de promoção por estágio — 2026-09-03

- `DEPLOYMENT_STAGE` foi formalizado no Compose/API; o health agora expõe `stage` sem confundir `NODE_ENV` com estágio de release.
- `deploy/vps/preflight.sh` bloqueia produção se houver HTTP/IP, `COOKIE_SECURE=false`, HSTS desligado, placeholder de segredo, seed automático ou ausência de confirmação de backup externo.
- **Estado:** PROD-14 parcialmente fechado no código; a instância atual permanece `homologacao` até domínio, TLS, segredos e backup externo existirem.

## Correção do login autenticado atrás do Nginx — 2026-09-03 20:31 UTC

- O login válido foi reproduzido com falha no callback NextAuth: API `200` em JSON, seguido de callback `502` em HTML.
- O log do proxy confirmou `upstream sent too big header`; o cookie de sessão ultrapassava o buffer padrão do Nginx.
- `deploy/docker/nginx.conf` recebeu buffers de cabeçalho/resposta maiores e o container do Nginx foi recriado, sem tocar em volumes.
- A repetição passou: callback `200`, sessão `200`, dashboard carregado e teste Playwright autenticado `1 passed`. O teste aguarda até 15 s porque a latência real da VPS excedeu o timeout anterior de 5 s.
- **Estado:** fluxo de autenticação corrigido em homologação; PROD-08 continua parcial porque os módulos, permissões, exports e integrações ainda não foram validados ponta a ponta.

## Navegação autenticada do portal principal — 2026-09-03 20:35 UTC

- Dez rotas principais do CRM foram abertas com autenticação real em desktop e viewport móvel.
- Todas retornaram `200`, mantiveram a rota esperada, sem erros de página, respostas `4xx/5xx` ou overflow horizontal.
- O exercício foi somente leitura; não houve mutação de registros.
- **Estado:** estrutura e responsividade do portal principal comprovadas; mutações, downloads, permissões negativas e integrações transacionais permanecem parciais.

## Fechamento técnico da rodada — 2026-09-03

- API: 48 testes em 16 arquivos aprovados; lint dos 7 pacotes aprovado; build completo aprovado.
- Dependências de produção: `pnpm audit --prod --json` retornou zero vulnerabilidades após atualização do Playwright para `1.55.1`.
- Brave contra a VPS: 10 testes aprovados e 2 omitidos por ausência deliberada de credenciais no runner padrão; fluxo autenticado separado aprovado.
- `caniuse-lite` foi atualizado para `1.0.30001810`; o build final não emitiu mais o aviso do Browserslist.
- **Estado:** gates técnicos executados aprovados; gates externos de produção continuam abertos.

## Guardas finais do perfil de produção — 2026-09-03

- O preflight agora exige `COMPOSE_FILE` com `deploy/docker/docker-compose.production.yml`, URLs HTTPS sem porta/caminho, correspondência entre `PUBLIC_*_URL` e `NGINX_*_HOST`, confirmação de firewall, rotação de SSH/root e rotação dos segredos.
- O `.env.example` documenta esses gates sem incluir qualquer segredo real; certificados `.pem`/`.key` são ignorados pelo Git e o diretório TLS tem instruções de instalação somente na VPS.
- O perfil de produção foi ensaiado remotamente com ambiente temporário: preflight aprovado, Compose limitado a `80/443` e Nginx TLS válido sem warning de HTTP/2. A instância ativa não foi promovida e permanece em homologação.
- A revalidação da instância ativa passou como `homologacao`, com seis serviços `healthy`, `nginx -t`, health e readiness aprovados. O teste negativo sem o override HTTPS foi recusado pelo guard (`PRODUCTION_BASE_COMPOSE_GUARD_OK`).
- **Decisão:** o código agora impede a promoção acidental pelo Compose base, mas produção segue bloqueada até evidências externas reais de domínio/TLS, firewall, rotação, backup/restore, integrações, carga, observabilidade e aceite.

## Correção de configuração Nginx defasada — 2026-09-03

- A última checagem encontrou uma cópia antiga do Nginx na VPS com redirect HTTPS como servidor padrão; o IP devolvia `308` em `/health` apesar do arquivo correto no repositório.
- O arquivo homologação foi sincronizado e somente o container Nginx foi recriado, preservando todos os volumes e os demais serviços.
- A repetição passou: `nginx -t`, health público, login público e readiness retornaram sucesso; seis containers ficaram `healthy`.
- **Decisão:** defeito fechado em homologação. O reload/recreate do Nginx agora é uma etapa explícita de atualização e verificação.

## Backup externo e restore isolado — 2026-09-03

- O restore drill falhou inicialmente porque a role `viviani_app` era criada depois da importação; `restore.sh` foi corrigido para garantir a role antes e depois do dump.
- O restore passou em PostgreSQL temporário com 17 tabelas; o archive de uploads foi extraído sem arquivos porque a homologação não possui mídia cadastrada.
- `restore.sh` agora valida o manifesto SHA-256 antes de qualquer parada/ação destrutiva. `backup.sh` aplica `umask 077` e validou cópia de três artefatos para destino externo temporário, com checksum no destino.
- Os units de backup `viviani-crm-backup.service`/`.timer` passaram no `systemd-analyze verify`; o agendamento ainda não foi instalado na VPS ativa porque o storage externo não está montado.
- **Decisão:** automação e restore técnico parcialmente fechados; storage externo real, criptografia, retenção periódica e confirmação formal continuam necessários para produção.

## Smoke operacional pós-deploy — 2026-09-03

- `deploy/vps/operational-smoke.sh` verifica seis healthchecks, `nginx -t`, landing/CRM/API públicos e ausência de portas próprias em API/CRM.
- Executado na VPS ativa: passou em `homologacao` após a correção do arquivo Nginx defasado.
- Alertas externos, SLO e retenção/consulta centralizada de logs continuam pendentes.

## Atualização controlada das ferramentas de validação — 2026-09-03

- O plano foi limitado a Playwright/axe e base Browserslist; upgrades de runtime não foram misturados.
- `@playwright/test` passou para `1.62.1`, `@axe-core/playwright` para `4.13.0`; `caniuse-lite 1.0.30001810` e `baseline-browser-mapping 2.11.21` ficaram fixados no package/lockfile.
- Pós-atualização: testes 48/48, lint 7/7, build forçado completo e Brave 10 pass/2 skipped por credenciais deliberadamente ausentes; `pnpm audit --prod --json` sem vulnerabilidades.
- A instalação continua reportando `multer@1.4.5-lts.2`, `eslint@8.57.1` e 11 subdependências deprecated. Permanecem como dívida P2 e exigem janela própria de compatibilidade.
- **Decisão:** evidência de validação atualizada e aprovada; nenhum novo gate de produção foi fechado por essa mudança.

## Hardening final, E2E autenticado e HML revalidada — 2026-09-03

- A CSP da landing não permite mais `unsafe-eval`; auto-templates autenticados propagam erro ao handler; falhas de appointments usam logger estruturado.
- Bio pública foi sanitizada e o renderer rico da landing passou a allowlist de tags e protocolos, eliminando HTML bruto não controlado nessa saída.
- Evidência local atual: API 53/53 em 17 arquivos, cobertura de linhas 28,45%, lint 7/7 e build completo aprovados. A última auditoria de produção concluída reportou zero vulnerabilidades; a correção não alterou dependências.
- Brave: público 10 pass/2 skipped; autenticado 3/3 desktop e 3/3 mobile, cobrindo dez rotas, ausência de erros de API/overflow e downloads físicos de leads, financeiro, disparos e segurança.
- QA efêmero removido; preflight e smoke remotos passaram em `homologacao`; seis serviços saudáveis; endpoint auto-templates sem sessão retorna `401`; nenhum listener local permanece.
- **Estado:** gaps de CSP/conteúdo/erro e prova autenticada básica foram fechados no escopo testado. Permanecem abertos mutações, autorização negativa por perfil, 2FA, integrações reais, exports adicionais, domínio/TLS, rotação, backup externo/restore, carga, observabilidade, LGPD e aceite.

## Revalidação final da homologação — 2026-09-03

- Lockfile final enviado à VPS; rebuild remoto com `pnpm install --frozen-lockfile` concluído sem Browserslist warning.
- A primeira execução imediata do smoke encontrou o estado transitório `nginx health is starting`; a inspeção seguinte mostrou `healthy` e a repetição passou.
- Preflight e smoke finais passaram em `homologacao`; seis serviços saudáveis e API/CRM sem bindings próprios.
- Brave pós-rebuild: 10 pass e 2 skipped por credenciais não fornecidas; auditoria de produção sem vulnerabilidades; `git diff --check` exit 0.
- **Decisão:** apresentação controlada aprovada. Produção segue bloqueada por requisitos externos e por fluxos ainda sem evidência transacional completa.

## Fechamento definitivo da validação local — 2026-09-03

- O teste dedicado de autenticação foi adicionado para username case-insensitive, resposta uniforme de credencial inválida, fluxo completo de OTP por e-mail e troca de senha autenticada.
- Bateria final: `pnpm test` 56/56 em 18 arquivos; cobertura V8 31,37% de linhas; `pnpm lint` 7/7; build forçado dos sete pacotes aprovado.
- O gerenciamento de usuários foi coberto com testes de criação e reset sem exposição de senha temporária e bloqueio de autoexclusão administrativa.
- A suíte Brave autenticada na VPS permanece comprovada em 3/3 desktop e 3/3 mobile; a suíte pública em 10 pass/2 skipped condicionais. A criação da conta QA foi apenas transitória e sua remoção foi verificada.
- **Estado final da rodada:** o que era possível fechar sem domínio, certificado, credenciais de integração, storage externo ou decisão de governança foi implementado e validado. Produção continua bloqueada pelos gates externos e P0/P1 documentados.

## Ampliação final da cobertura de rotas — 2026-09-03

- Foram adicionados testes de conteúdo para sanitização da bio pública, lookup direto, falha explícita de banco em auto-templates, validação de identificador e sanitização de HTML antes da persistência.
- Bateria reproduzida: `pnpm test` 61/61 em 19 arquivos; cobertura V8 32,85% de linhas; `pnpm lint` 7/7; build completo dos sete pacotes aprovado.
- O aumento de cobertura melhora a evidência de autenticação, usuários e CMS, mas não fecha a cobertura de integração real, mutações E2E, carga ou os gates externos de produção.
- **Estado:** homologação controlada permanece aprovada com dados sintéticos; produção permanece bloqueada até os requisitos externos e de governança já catalogados.
