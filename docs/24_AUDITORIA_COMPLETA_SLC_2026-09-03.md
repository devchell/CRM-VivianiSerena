# Auditoria completa SLC — VivianiCRM

**Data:** 2026-09-03  
**Escopo:** segurança, funcionalidades, fluxos, conectividades, UI/UX e prontidão de entrega  
**Ambiente principal:** VPS self-hosted Docker em `87.76.215.134`  
**Status de conclusão:** aprovado para apresentação/homologação assistida; não aprovado para produção com dados reais

> **Leitura vigente:** a seção 12 é o snapshot vinculante após a revalidação de 03/09/2026. As seções 1–11 preservam achados e decisões cronológicos; quando houver divergência, a evidência posterior da seção 12 prevalece.

## 1. Resumo executivo

O produto está funcional como sistema de demonstração: API, CRM, landing, Nginx, PostgreSQL e Redis estão operacionais na VPS; o login do CRM funciona por username/e-mail; os principais CRUDs e fluxos de leads, agenda, financeiro, disparos, conteúdo, segurança e analytics foram exercitados; os builds e lint passaram; e a navegação do CRM foi verificada em desktop e celular sem overflow horizontal nem erro visível.

A conclusão não pode ser elevada para “produção” porque há bloqueios concretos:

- o acesso ainda é HTTP por IP, sem TLS, domínio e cookies `Secure`;
- API e CRM continuam publicados diretamente nas portas `4000` e `3001`;
- não há backup externo automatizado nem teste de restauração comprovado;
- SMTP está configurado, mas as credenciais foram rejeitadas pelo Gmail (`535 Username and Password not accepted`);
- Google está configurado, mas não conectado; WhatsApp não está configurado;
- a publicação da landing está bloqueada por `LANDING_REVALIDATE_URL` ausente;
- há quatro vulnerabilidades moderadas reportadas por `pnpm audit --prod`, incluindo uma vulnerabilidade de disponibilidade no `fflate` com CVSS 7.5;
- existe uma superfície de HTML rico sem sanitização explícita antes de ser renderizada na landing e em e-mails;
- a senha temporária gerada para usuário pode ser devolvida no `meta` da API administrativa;
- RLS e a política formal de retenção de dados não estão comprovadas no ambiente self-hosted;
- ainda não existe uma suíte E2E automatizada cobrindo o sistema completo.

Portanto, o ambiente pode ser apresentado com dados sintéticos. Não deve receber leads reais, credenciais reais de clientes, dados financeiros reais ou tokens de integração antes da Fase 5.

## 2. Critério de evidência

| Rótulo | Significado |
| --- | --- |
| **PASSOU** | comportamento observado e reproduzido no ambiente avaliado |
| **CONTROLADO** | o sistema respondeu de forma honesta a uma dependência ou configuração ausente |
| **CORRIGIDO ANTES DESTE RELATÓRIO** | defeito encontrado durante a rodada e corrigido/reimplantado antes da validação final |
| **PENDENTE** | código existe, mas faltou condição externa ou prova operacional |
| **NÃO COMPROVADO** | não houve evidência suficiente para declarar pronto |
| **BLOQUEIO** | deve ser resolvido antes de uso com dados reais |

A auditoria foi feita sobre o código completo disponível no repositório, a configuração Docker self-hosted e o ambiente remoto por IP. O repositório já estava com WIP extenso e alterações anteriores; nenhum arquivo existente foi revertido ou apagado para produzir este relatório.

## 3. Fase 0 — Inventário e fronteiras

### 3.1 Arquitetura encontrada

- `apps/api`: Express, Prisma, PostgreSQL, Redis, Socket.IO, jobs, autenticação, autorização, LGPD, storage local e integrações.
- `apps/crm`: Next.js App Router, NextAuth, dashboard autenticado e módulos operacionais.
- `apps/landing`: Next.js, captura pública de lead, analytics, vitals, SEO, carrossel de avaliações e parallax do HERO.
- `packages/types`, `packages/utils`, `packages/ui` e `packages/config`: contratos, validações, componentes e configurações compartilhadas.
- Docker Compose: `postgres:16-alpine`, `redis:7-alpine`, API, CRM, landing e Nginx.
- Volumes persistentes: `postgres_data`, `redis_data` e `api_data`.
- Banco criado do zero na VPS; não houve migração de dados legados.

### 3.2 Superfícies auditadas

- autenticação por username/e-mail, refresh token, troca obrigatória de senha e 2FA;
- autorização por perfil, módulo e permissão no backend;
- leads públicos e manuais, filtros, detalhe, status, origem, exportação, disparos e privacidade;
- agenda, disponibilidade, integração Google e cancelamento;
- financeiro, recorrência, resumo, gráficos, exportação e preservação do histórico;
- edição do site, upload, versões, restauração, publicação e conteúdo público;
- colaboradores, convites, reenvio e perfis;
- administração, SMTP, Google, WhatsApp e checks de infraestrutura;
- segurança, bloqueio de IP, eventos, alertas e checklist;
- analytics, sessões, eventos e Web Vitals;
- landing, login e todas as dez rotas principais do CRM.

## 4. Fase 1 — Auditoria de segurança

### 4.1 Controles que passaram

- autorização sensível está no backend, não apenas escondida no menu do CRM;
- JWT de acesso usa RS256 com issuer/audience verificados;
- cookies são `httpOnly` e `SameSite=Lax`; o modo `Secure` está desabilitado apenas porque o ambiente ainda é HTTP;
- CORS usa lista explícita de origens e credenciais;
- `helmet` está ativo na API com CSP, `nosniff`, `frame-ancestors`, `Referrer-Policy` e bloqueio de objetos;
- endpoints protegidos retornam `401` sem autenticação e `403` quando a permissão não é suficiente;
- entradas de negócio usam Zod em grande parte das rotas;
- uploads aceitam apenas MIME de imagem, passam por Sharp, são convertidos para WebP e usam nome de arquivo seguro;
- leads públicos registram consentimento e IP parcialmente anonimizado;
- leads e lançamentos usam arquivamento por `deletedAt`; agendamentos preservam histórico;
- webhook WhatsApp exige configuração e assinatura válida;
- rate limit global e rate limit de autenticação estão ativos;
- login por username é normalizado sem diferenciação de maiúsculas/minúsculas;
- o honeypot público e entradas inválidas rejeitadas foram testados;
- não foram encontrados segredos reais rastreados no Git. Os arquivos `.env.example` contêm apenas placeholders.

### 4.2 Achados de segurança e soluções

#### SEC-01 — HTTP expõe credenciais, sessão e dados pessoais

**Severidade:** P0 / bloqueio de produção  
**Evidência:** landing, CRM e API usam `http://87.76.215.134`; o checklist de segurança remoto marca HTTPS e certificado SSL como pendentes; `COOKIE_SECURE=false` e `ENABLE_HSTS=false` no ambiente de apresentação.

**Impacto:** qualquer pessoa no caminho de rede pode interceptar senha, cookie, JWT, lead, dados financeiros ou tokens enviados ao browser. A conexão não atende a um CRM com dados pessoais e LGPD.

**Solução forte:**

1. apontar um domínio para a VPS;
2. configurar TLS no Nginx com renovação automática;
3. redirecionar HTTP para HTTPS;
4. definir `PUBLIC_LANDING_URL`, `PUBLIC_CRM_URL`, `PUBLIC_API_URL`, CORS e callback Google com HTTPS;
5. ativar `COOKIE_SECURE=true` e `ENABLE_HSTS=true` somente após verificar o certificado;
6. repetir login, refresh, troca de senha, OAuth, SMTP e webhook;
7. validar o certificado externamente e guardar a data de expiração em monitoramento.

**Aceite:** nenhum fluxo autenticado usa HTTP; `Set-Cookie` contém `Secure`; HTTP retorna redirect; HTTPS responde 200; HSTS aparece somente no domínio TLS.

#### SEC-02 — API e CRM estão expostos diretamente nas portas 4000 e 3001

**Severidade:** P0/P1 operacional  
**Evidência:** `docker-compose.yml` publica `4000:4000` e `3001:3001`; o Nginx publica somente a porta 80 e não é o único ponto de entrada.

**Impacto:** amplia superfície de ataque, permite contornar o proxy e dificulta aplicar TLS, headers, limites, logs e firewall de maneira uniforme.

**Risco relacionado:** `apps/api/src/app.ts` usa `app.set('trust proxy', 1)`. Com a API diretamente acessível, cabeçalhos `X-Forwarded-For` podem influenciar IP usado em rate limit, bloqueio e auditoria dependendo do caminho de rede.

**Solução forte:**

- remover `ports` públicos de API e CRM e mantê-los apenas na rede Docker;
- expor a aplicação por Nginx em hosts/subdomínios definidos;
- se a porta direta precisar existir durante a homologação, restringi-la no firewall ao IP de administração e removê-la antes da entrega;
- configurar `trust proxy` para o salto conhecido do proxy, não para qualquer caminho presumido;
- validar que todos os endpoints continuam acessíveis pelo proxy e que as portas internas não respondem externamente.

**Aceite:** somente 80/443 ficam públicos; `nmap`/teste externo não encontra 3001/4000; o IP do request vem do proxy confiável.

#### SEC-03 — Acesso operacional ainda depende de root e senha não rotacionada

**Severidade:** P0 / bloqueio de produção  
**Evidência:** o acesso inicial da VPS foi fornecido como usuário `root` com senha; não há prova registrada nesta rodada de rotação, chave SSH exclusiva, desativação de senha ou desativação do login root.

**Impacto:** comprometimento da credencial concede controle total do host, volumes, banco, tokens e imagens.

**Solução forte:** criar usuário operacional sem privilégio permanente, instalar chave SSH individual, testar acesso, restringir SSH por firewall, desabilitar login root e autenticação por senha, instalar atualizações de segurança e configurar fail2ban ou equivalente. A senha inicial deve ser considerada comprometida por ter sido compartilhada em chat e precisa ser revogada.

**Aceite:** acesso administrativo por chave nominativa; `PermitRootLogin no`; `PasswordAuthentication no`; somente portas necessárias abertas; teste de recuperação documentado.

#### SEC-04 — Volumes Docker não são backup

**Severidade:** P0 / bloqueio de produção  
**Evidência:** `BACKUP_ENABLED` está fixado como `"false"` no Compose; a documentação declara que não existe backup externo automatizado; o checklist remoto marca backup como pendente.

**Impacto:** perda da VPS pode apagar PostgreSQL, uploads, histórico, consentimentos, financeiro e configurações cifradas. Volume persistente protege contra restart, não contra falha do host, ransomware ou exclusão.

**Solução forte:** executar dump PostgreSQL criptografado e cópia dos uploads em armazenamento externo, com retenção diária/semanal, checksum, alerta de falha e política de acesso separado da VPS. Redis deve ser tratado como cache/sessão, não como fonte de recuperação. Fazer restore drill periódico em host isolado e validar login, leads, conteúdo, uploads e integrações.

**Aceite:** backup recente comprovável, restore executado, RPO/RTO definidos, alerta de falha e procedimento de rollback testado.

#### SEC-05 — SMTP configurado, mas não autenticado

**Severidade:** P0 para entrega real; P1 para apresentação  
**Evidência:** durante disparo válido, os logs da API registraram erro Nodemailer `EAUTH` com resposta Gmail `535 Username and Password not accepted`. A API preservou o status `provider_failed`, portanto não houve falsa confirmação de entrega.

**Impacto:** convites, reset de colaborador, 2FA por e-mail, confirmação de agenda, notificações e campanhas não chegam. O sistema aparenta possuir SMTP configurado, mas o provedor não aceita as credenciais.

**Solução forte:** substituir a senha por App Password ou credencial de um provedor transacional adequado, validar SPF/DKIM/DMARC e remetente, executar o teste de e-mail do painel e confirmar recebimento real. Adicionar health check de SMTP autenticado, status `configured` separado de `verified`, alerta para falhas consecutivas e fila/retry com backoff. Para operação segura, bloquear campanhas quando o canal estiver apenas “configurado” e não “verificado”.

**Aceite:** e-mail de teste recebido, convite recebido, 2FA recebido, campanha de teste recebida, registro de provider message id e nenhum `EAUTH` nos logs.

#### SEC-06 — Dependências de produção com quatro vulnerabilidades conhecidas

**Severidade:** P1 até atualização; scanner classificou como moderate  
**Evidência:** `pnpm audit --prod --json` em 2026-09-03 encontrou 4 moderadas, 0 altas e 0 críticas, em 495 dependências de produção.

| Pacote | Versão observada | Problema | Solução |
| --- | --- | --- | --- |
| `qs` | 6.15.2 | bypass de limite de array via bracket-key; CVE-2026-82562 | atualizar para `>=6.16.0`, regenerar lockfile e testar query/body limits |
| `qs` | 6.15.2 | `isBuffer` controlado pode provocar exceção/DoS; CVE-2026-82417 | atualizar para `>=6.16.0` e adicionar teste de parser malformado |
| `@tiptap/core` | 2.27.2 | `mergeAttributes` pode transformar `__proto__` em atributos DOM executáveis; advisory GHSA-cp6q-959q-f8rh | atualizar a família Tiptap para linha corrigida `>=3.30.4` ou aplicar patch oficial compatível com a versão usada |
| `fflate` | 0.8.2 | loop infinito em ZIP64 malformado; CVE-2026-45820, CVSS 7.5 | atualizar para `>=0.8.3` e testar ZIP malformado antes do deploy |

**Solução forte:** atualizar em branch isolada, alinhar todo o conjunto Tiptap, regenerar `pnpm-lock.yaml`, rodar testes, build, audit e teste de regressão no editor/PDF. Não silenciar o audit nem manter override inseguro sem justificativa registrada.

**Aceite:** `pnpm audit --prod` sem vulnerabilidades reportáveis ou exceções formalmente aprovadas com prazo e mitigação.

#### SEC-07 — HTML rico sem sanitização explícita antes de sair para público/e-mail

**Severidade:** P1 condicional / stored XSS e abuso de template  
**Evidência:** `apps/landing/src/components/About.tsx:186` renderiza `bio` via `dangerouslySetInnerHTML`; `apps/api/src/routes/content.ts:559` aceita JSON genérico com `value`; `packages/utils/src/validation.ts:27` apenas escapa texto e não é o sanitizador usado nesse caminho; templates de e-mail em `apps/api/src/infrastructure/email.ts:109` e `:159` usam HTML salvo.

**Condição:** um usuário com permissão de editar conteúdo ou um valor comprometido precisa gravar HTML malicioso. O conteúdo pode então ser distribuído para visitantes ou para clientes em e-mail.

**Impacto:** XSS persistente em landing, atributos perigosos, links inadequados ou conteúdo malicioso enviado por e-mail; risco elevado porque a superfície é pública.

**Solução forte:**

- aceitar uma estrutura de rich text conhecida, não HTML arbitrário;
- sanitizar no backend com allowlist de tags, atributos e protocolos antes de persistir;
- sanitizar novamente na fronteira de renderização pública;
- remover `style`, eventos, `javascript:`, `data:` não necessário, SVG e iframes da allowlist;
- validar URLs com `https` ou rotas internas;
- usar um template DSL para e-mails, com variáveis permitidas e conteúdo textual escapado;
- adicionar regressão com payloads `onerror`, `javascript:`, `svg`, `iframe`, `__proto__` e atributos herdados;
- endurecer CSP da landing, removendo `unsafe-eval` e reduzindo `unsafe-inline` quando a implementação permitir.

**Aceite:** payload malicioso é removido/escapado no servidor; HTML público não executa código; e-mails só aceitam tags/variáveis permitidas; teste automatizado cobre a fronteira.

#### SEC-08 — Endpoint administrativo devolve senha temporária no JSON

**Severidade:** P1  
**Evidência:** `apps/api/src/routes/users.ts:489` retorna `meta.tempPassword: result.tempPassword` em `POST /users/:id/reset-temp-password`. A senha também é enviada pelo fluxo de convite quando SMTP está ativo.

**Impacto:** a senha temporária pode aparecer em DevTools, logs de proxy, tracing, histórico de requisição ou captura acidental. No ambiente atual isso ocorre sobre HTTP, agravando o risco.

**Solução forte:** nunca devolver senha em resposta de API. Usar convite de uso único com token aleatório, expirável e armazenado como hash; enviar o link por SMTP verificado; forçar troca no primeiro acesso. Se o e-mail falhar, o painel deve exibir somente “entrega manual pendente” e exigir um canal administrativo seguro separado, sem registrar ou devolver a senha em JSON.

**Aceite:** inspeção de resposta, logs e proxy não contém senha; convite expira; token só pode ser usado uma vez; troca obrigatória revoga sessões anteriores.

#### SEC-09 — RLS e governança de dados não estão comprovadas no PostgreSQL self-hosted

**Severidade:** P1 de defesa em profundidade; P0 se o banco for exposto ou houver multi-tenant  
**Evidência:** não foram encontrados `CREATE POLICY` ou `ENABLE ROW LEVEL SECURITY` nas migrations atuais; a documentação antiga descreve RLS Supabase, mas o ambiente vigente usa PostgreSQL Docker e Prisma. O backend possui autorização real e o banco não publica porta externa, mas isso não substitui uma decisão formal de isolamento.

**Impacto:** um bypass futuro na API, credencial de aplicação reutilizada ou novo módulo pode acessar dados além do esperado. A documentação pode induzir falsa sensação de proteção.

**Solução forte:** escolher e documentar uma estratégia. Para single-tenant: usuário de aplicação sem DDL, grants mínimos, banco privado, migrations por usuário separado, auditoria e testes de autorização. Para evolução multi-tenant: `tenant_id` em entidades, RLS real com contexto de transação e testes cruzados entre tenants. Atualizar a documentação para não declarar RLS ativa enquanto ela não existir.

**Aceite:** consulta SQL comprova a política adotada, grants são mínimos, testes negativos entre perfis/tenants passam e documentação coincide com o runtime.

#### SEC-10 — Rate limit e brute force são locais ao processo

**Severidade:** P1 operacional  
**Evidência:** `apps/api/src/middleware/rateLimiter.ts` usa o store padrão do `express-rate-limit`; `apps/api/src/middleware/security.ts` mantém `loginFailures` em `Map` de memória. O bloqueio de IP manual usa Redis, mas não substitui os dois controles de autenticação.

**Impacto:** restart, múltiplas réplicas ou troca de container pode resetar contadores; ataques distribuídos podem contornar limite por processo.

**Solução forte:** usar store Redis para rate limit e brute force, separar chaves por IP e identificador normalizado, aplicar janela deslizante, `Retry-After`, backoff progressivo e alerta. Não revelar se o usuário existe. Testar concorrência e comportamento após restart.

**Aceite:** limite persiste após reinício, funciona em qualquer réplica, bloqueia IP/conta de forma previsível e não gera falso positivo para operação normal.

#### SEC-11 — CRM não entrega os mesmos headers de segurança da landing/API

**Severidade:** P1  
**Evidência:** `curl -I http://87.76.215.134:3001/login` mostrou `X-Powered-By: Next.js` e não mostrou CSP, `X-Frame-Options`, `Referrer-Policy` ou `Permissions-Policy`. `apps/crm/next.config.mjs` não define `headers()`; landing e API possuem headers mais fortes.

**Impacto:** o principal portal autenticado tem uma camada de hardening mais fraca e revela tecnologia desnecessariamente.

**Solução forte:** aplicar no CRM headers equivalentes e específicos para área autenticada via `next.config.mjs` ou Nginx: CSP compatível com NextAuth, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS somente em HTTPS e `poweredByHeader:false`. Testar callback OAuth, WebSocket e recursos legítimos após endurecer CSP.

**Aceite:** login e rotas autenticadas entregam headers esperados, não podem ser embutidas em iframe externo e não quebram recursos do CRM.

#### SEC-12 — Bootstrap fresco usa `prisma db push --accept-data-loss`

**Severidade:** P1 operacional  
**Evidência:** `deploy/docker/api-entrypoint.sh` executa bootstrap destrutivo quando `FRESH_DATABASE=true`; `deploy/vps/.env.example` começa com `FRESH_DATABASE=true`.

**Impacto:** erro humano ao copiar o exemplo ou reusar ambiente pode executar uma operação incompatível com preservação de dados. O marcador reduz repetição, mas não elimina a classe de risco.

**Solução forte:** retirar bootstrap destrutivo do entrypoint normal; criar comando de inicialização separado, interativo ou protegido por arquivo de confirmação fora do diretório da aplicação; exigir `NODE_ENV` de bootstrap específico, confirmação do nome do banco e backup verificado; manter o runtime com `FRESH_DATABASE=false` e migrations versionadas.

**Aceite:** iniciar/recriar API em produção nunca executa `db push --accept-data-loss`; bootstrap é uma operação explicitamente separada e auditada.

#### SEC-13 — Logs de erro carregam detalhes de provedores e alguns fluxos ainda usam console

**Severidade:** P2  
**Evidência:** o código registra erros de Nodemailer/Google/integrações e alguns `console.error` em rotas; o erro SMTP observado expôs detalhes do provedor no log.

**Impacto:** logs podem conter e-mails, URLs, stack traces, metadados de provedor ou dados de diagnóstico além do necessário; retenção e acesso ao volume `api_data` não estão formalizados.

**Solução forte:** logger estruturado com redaction de e-mail, token, URL sensível e payload; correlation id; níveis definidos; retenção limitada; acesso ao volume restrito; erro completo somente em sink protegido e mensagem operacional genérica no cliente.

#### SEC-14 — Migrations históricas não têm rollback no mesmo diretório

**Severidade:** P2 de governança  
**Evidência:** as quatro migrations anteriores de feature possuem `migration.sql`, mas não possuem `rollback.sql`; as duas migrations mais recentes possuem rollback. O contrato do projeto exige reversão para migration nova.

**Impacto:** rollback operacional fica manual e arriscado, especialmente em alteração de dados ou schema.

**Solução forte:** adicionar procedimento reversível documentado para cada migration histórica ou registrar formalmente por que a reversão não é segura; para toda migration futura, manter up/down, backup prévio, teste em cópia e plano de restauração.

## 5. Fase 2 — Testes de funcionalidades e fluxos

### 5.1 Automação local

| Verificação | Resultado |
| --- | --- |
| API Vitest | **PASSOU:** 15 arquivos, 43 testes |
| API lint | **PASSOU** |
| CRM lint | **PASSOU** |
| Landing lint | **PASSOU** |
| API TypeScript build | **PASSOU** |
| CRM Next build | **PASSOU:** Next.js 15.5.25, 20 rotas geradas |
| Landing Next build | **PASSOU:** 10 páginas/rotas geradas |
| `git diff --check` | sem erro de whitespace; apenas avisos de conversão LF/CRLF |
| Suite E2E Playwright/Cypress no repositório | **NÃO COMPROVADO:** não existe suíte E2E versionada encontrada |
| Axe/Lighthouse/Pa11y versionado | **NÃO COMPROVADO:** não existe execução automatizada encontrada |

### 5.2 Matriz funcional remota

| Área | Fluxos exercitados | Resultado |
| --- | --- | --- |
| Autenticação | login, refresh, `me`, username com caixa variada, acesso por e-mail | **PASSOU** |
| Proteção sem sessão | leads, administração e financeiro sem auth | **PASSOU:** 401 |
| Leads | captura pública, criação manual, lista, stats, detalhe, filtro, update, patch, bulk, export, GDPR e arquivamento | **PASSOU** |
| Agenda | criação, lista, disponibilidade sem Google, patch, cancelamento preservando histórico | **PASSOU** |
| Financeiro | criação, recorrência, lista, resumo, gráficos, patch por substituição, arquivamento | **PASSOU** |
| Disparos | settings, draft, audiência, histórico, envio controlado e retry idempotente | **PASSOU**; provider de e-mail marcou falha real |
| Conteúdo | leitura pública, aliases, histórico, atualização inválida, upload e publicação | **CONTROLADO**; publicar depende de revalidação ausente |
| Segurança | eventos, stats, atividade, bloqueio/desbloqueio, alerta, resolução e checklist | **PASSOU** |
| Analytics | pageview, evento, vitals e dashboard autenticado | **PASSOU** |
| Privacidade | exportação LGPD e limpeza de registro sintético | **PASSOU** |
| Google Business | chamada sem OAuth conectado | **CONTROLADO:** 409 explícito |
| WhatsApp | webhook sem configuração | **CONTROLADO:** 503 explícito |

Também foi executada uma matriz de leituras com 40/40 respostas esperadas e uma matriz de 11/11 entradas inválidas rejeitadas/controladas. A matriz negativa incluiu leads, appointments, financials, recorrência, usuários, templates, disparos, segurança e conteúdo.

### 5.3 Correções que já chegaram ao ambiente antes deste relatório

Estes defeitos foram encontrados durante a rodada anterior, corrigidos e reimplantados:

- `PATCH /leads/bulk` sem `updates` deixou de responder 500 e passou a responder 400 com mensagem de validação;
- aliases de conteúdo (`resultados`, `servicos`, `depoimentos`) deixaram de provocar erro de enum e retornam a seção correta;
- atualização de conteúdo sem propriedade `value` passou a ser rejeitada;
- publicação da landing deixou de exibir sucesso falso quando a revalidação não está configurada;
- ações de segurança deixaram de esconder erro HTTP e exibem falha real;
- login passou a diferenciar limite 429 de credenciais inválidas;
- exportadores CSV passaram a revogar `ObjectURL` depois da janela de download;
- conteúdo público não cria depoimentos inventados e não inclui partículas, `Sparkles`, estrelas Unicode ou emojis decorativos.

### 5.4 Gaps funcionais remanescentes

#### FUN-01 — Download físico não foi comprovado pelo evento do browser

**Severidade:** P1 de aceite  
**Evidência:** os endpoints de exportação retornaram 200 e o código foi ajustado para preservar `ObjectURL`, mas a espera por evento de download no browser não concluiu durante a validação.

**Solução forte:** adicionar E2E real para CSV e PDF em leads, disparos, financeiro e segurança; verificar nome, MIME, conteúdo, encoding, quantidade de linhas e revogação sem race condition. O botão só deve exibir sucesso após a criação real do arquivo.

#### FUN-02 — Integrações externas não tiveram fluxo feliz completo

Google, WhatsApp, SMTP autenticado e 2FA por e-mail/SMS não podem ser marcados como “passaram” sem credenciais válidas, callback e evento real. O sistema respondeu de forma controlada quando ausentes, mas isso é diferente de integração pronta.

**Solução forte:** executar uma rodada de homologação com contas de teste, domínio HTTPS, mailbox de teste, WABA sandbox e calendário Google de teste; registrar evidência de cada ida e volta e revogar credenciais ao terminar.

#### FUN-03 — Não há E2E automatizado de regressão

**Solução forte:** criar uma suíte mínima em Playwright com fixtures sintéticas e limpeza por prefixo de QA: login, permissões, lead público→CRM, agenda, financeiro, conteúdo, exportação, disparo sem provedor, checklist e mobile. Rodar no CI e antes de cada deploy.

## 6. Fase 3 — Testes de conectividade e infraestrutura

### 6.1 Estado de rede e dependências

| Verificação | Resultado observado |
| --- | --- |
| `GET http://87.76.215.134/` | 200 |
| `GET http://87.76.215.134:3001/login` | 200 |
| `GET http://87.76.215.134:4000/health` | 200; database, Redis e uploads true |
| `GET http://87.76.215.134:4000/health/ready` | 200; database e Redis true |
| `GET /robots.txt` | 200 |
| `GET /sitemap.xml` | 200 |
| API sem autenticação | 401 nas rotas protegidas |
| Conteúdo público | 200 |
| PostgreSQL e Redis publicados no host | não; permanecem na rede Docker |
| listeners locais 3000/3001/4000 nesta máquina | nenhum |
| seis serviços Docker na VPS | healthy na janela de redeploy/QA |

### 6.2 Integrações

| Integração | Estado | Evidência | Solução forte |
| --- | --- | --- | --- |
| PostgreSQL | **PASSOU** | readiness e CRUDs reais | backup, restore drill, grants mínimos e monitoramento |
| Redis | **PASSOU** | readiness, cache, refresh e bloqueios | store distribuído de rate limit e política de persistência |
| storage local | **PASSOU** | health de uploads e upload/remoção controlados | backup externo dos uploads e limite/antivírus se a origem deixar de ser confiável |
| Nginx | **PASSOU para HTTP de apresentação** | landing e health públicos | TLS, proxy único, headers e portas internas |
| SMTP | **PENDENTE/BLOQUEADO** | configuração presente, autenticação Gmail rejeitada | credencial válida, verificação, fila, alerta e teste de recebimento |
| Google Calendar | **PENDENTE** | configurado, não conectado; disponibilidade responde de modo honesto | OAuth HTTPS, callback exato, calendário de teste e CRUD de evento |
| Google Business | **PENDENTE** | 409 quando OAuth não conectado | autorizar conta, listar local, vincular local e validar reviews reais |
| WhatsApp Business | **PENDENTE** | variáveis ausentes; webhook responde 503 | Meta App/WABA/número, Embedded Signup, webhook HTTPS e receipts |
| revalidação da landing | **PENDENTE** | `LANDING_REVALIDATE_URL` ausente; publish não finge sucesso | endpoint interno assinado, segredo separado, timeout e confirmação de conteúdo |

### 6.3 Problema de SEO/ambiente que deve ser resolvido antes de divulgação

O HTML público responde com canonical, Open Graph, sitemap e JSON-LD apontando para `http://87.76.215.134`. Isso é adequado para uma apresentação técnica temporária, mas não para indexação final. Ao configurar domínio, gerar todos os URLs novamente e remover o IP dos metadados.

## 7. Fase 4 — Auditoria de UI/UX

### 7.1 Método

Foram usados os critérios das skills de design audit, UI/UX Pro Max e controle do Brave: hierarquia visual, contraste, foco, responsividade, movimento, estados vazios, campos, sobreposição, overflow, acessibilidade estrutural e consistência de linguagem.

O gerador de design sugeriu um CRM profissional de alto contraste, sem emojis como ícones, com estados claros, responsividade em 375/768/1024/1440 e transições curtas. A recomendação genérica de azul/verde não foi aplicada cegamente: a auditoria preservou o DNA já definido para o produto — landing editorial em marfim/carvão/cobre e CRM operacional em grafite/cobre — porque a marca e a direção solicitada exigem continuidade, não um tema genérico.

### 7.2 Passes visuais

| Cenário | Resultado |
| --- | --- |
| Landing no Brave em desktop | **PASSOU:** HERO real carregado, texto legível, CTAs sem sobreposição, sem tela cinza prolongada e sem erro de console |
| CRM em desktop | **PASSOU:** shell, sidebar, cards, gráficos e tabela sem overflow; hierarquia e contraste coerentes |
| CRM em 390×844 | **PASSOU:** dez rotas, sem overflow horizontal, sem erro visível e sem clipping de conteúdo principal |
| CRM em 1440px | **PASSOU na janela anterior de QA:** grids, shell e módulos sem overflow |
| estados de loading | **PASSOU com ressalva:** skeletons aparecem; indicador online usa pulse real de status |
| foco e movimento reduzido | **PARCIAL:** CSS global tem `:focus-visible` e `prefers-reduced-motion`; não houve auditoria automatizada de todos os nós |
| acessibilidade automatizada | **NÃO COMPROVADO:** nenhuma execução Axe/Lighthouse/Pa11y versionada |
| landing em mobile | **NÃO COMPROVADO nesta execução:** o Brave manteve viewport de desktop na aba da landing; precisa de uma rodada dedicada de 390px |

### 7.3 Achados de UI/UX e soluções

#### UI-01 — Hover 3D ainda existe na seção de serviços da landing

**Severidade:** P1 de coerência visual  
**Evidência:** `apps/landing/src/components/Services.tsx:92-96` aplica `perspective`, `rotateX`, `rotateY` e `translateZ`; o componente usa `perspective`, `preserve-3d` e `will-change-transform`.

**Impacto:** contradiz a direção aprovada de landing humana, editorial e silenciosa; reintroduz justamente o efeito genérico/de “IA” que o responsável pediu para remover.

**Solução forte:** remover o transform 3D e manter somente estado 2D com elevação curta, borda e transição de cor; se o hover for mantido, fazê-lo com `translateY(-2px)` e sombra discreta, desativado sob `prefers-reduced-motion`. Remover classes 3D e o `will-change` permanente.

**Aceite:** nenhuma ocorrência de `perspective`, `rotateX`, `rotateY`, `translateZ`, `preserve-3d` ou `will-change-transform` no caminho público; hover continua informativo e não ornamental.

#### UI-02 — Funil vazio mostra barra cinza sem explicação suficiente

**Severidade:** P2  
**Evidência:** no dashboard visual do Brave, com base sintética quase vazia, o funil exibe uma barra cinza para “Novos” e linhas vazias para os demais estados. O usuário pode interpretar como skeleton travado, em vez de “não há dados”.

**Solução forte:** quando todos os valores são zero, trocar o gráfico por estado vazio explícito: “Ainda não há leads no funil” + CTA “Cadastrar lead” ou “Ver captura pública”. Manter skeleton apenas enquanto `loading=true` e nunca depois da resposta.

**Aceite:** zero é visualmente diferente de carregando; o usuário entende o próximo passo sem abrir DevTools.

#### UI-03 — Alguns campos do CRM não estão associados semanticamente ao label

**Severidade:** P1 de acessibilidade  
**Evidência:** em Configurações, a inspeção DOM encontrou campos com label visual, mas sem `htmlFor`/`id` ou label envolvendo o input. O teste contou três campos sem associação explícita e um botão icon-only com apenas `title="Sair"`.

**Impacto:** leitores de tela podem não anunciar o contexto do campo; teclado e automação assistiva têm menos informação.

**Solução forte:** dar `id` único a cada controle e `htmlFor` correspondente; adicionar `aria-describedby` para ajuda/erro; usar `aria-label` em botões somente-ícone; validar nome acessível, ordem de tabulação, foco, contraste e mensagens de erro com Axe.

**Aceite:** zero campos sem nome acessível; zero botões interativos sem nome; foco visível em claro/escuro; teste automatizado passa.

#### UI-04 — Landing mantém resíduos de CSS de fases antigas

**Severidade:** P2 de manutenção visual  
**Evidência:** `globals.css` ainda contém classes/comentários de `pulse-soft`/FOMO, `shimmer`, `perspective`, `preserve-3d`, gradientes e helpers antigos. Parte está sem uso, mas uma parte 3D ainda é usada.

**Impacto:** aumenta a chance de alguém reintroduzir linguagem rejeitada e torna difícil saber qual token é oficial.

**Solução forte:** remover classes sem uso, centralizar tokens em um único arquivo, apagar comentários de FOMO e manter apenas efeitos que aparecem no design aprovado: parallax sutil do HERO, transições de estado e skeleton de carregamento real.

#### UI-05 — Contraste e segurança visual são desiguais entre as três superfícies

**Severidade:** P2  
**Evidência:** CRM usa tokens de grafite/cobre e apresenta bom contraste no dashboard; landing possui CSP mais permissiva (`unsafe-inline`, `unsafe-eval`) e o CRM não possui headers equivalentes. O contraste visual não substitui o hardening de origem.

**Solução forte:** aplicar tokens e headers de forma centralizada por superfície, medir contraste com Axe/Lighthouse em claro e escuro, remover `unsafe-eval`, usar nonce/hash quando necessário e manter o acento verde somente em estado real de WhatsApp/online.

#### UI-06 — Validação mobile da landing precisa de uma rodada dedicada

**Severidade:** P1 de aceite responsivo  
**Evidência:** CRM foi verificado a 390×844; a aba da landing no Brave permaneceu em 1920px mesmo após tentativa de override, então não é correto declarar a landing mobile como comprovada nesta execução.

**Solução forte:** abrir uma nova aba Brave com viewport efetivamente 390×844 e validar HERO, menu, carrossel, formulário multi-etapas, CTA flutuante, FAQ e páginas legais; repetir em 768, 1024 e 1440. Verificar overflow, foco, corte de placeholders e posição de botões após teclado virtual.

### 7.4 Pontos positivos visuais

- o HERO atual preserva a composição original, usa imagem local, carrossel e parallax apenas na imagem;
- a imagem do HERO carregou sem o atraso cinza relatado anteriormente;
- não há `Sparkles`, estrela decorativa, emoji de IA ou depoimentos artificiais no HTML público observado;
- o CRM tem sidebar clara, active state em cobre, surfaces planas e contraste mais consistente;
- em 390px, o CRM esconde a sidebar desktop corretamente e não cria overflow;
- os estados de Google, SMTP, WhatsApp e segurança aparecem como pendentes quando não estão prontos, sem simular sucesso.

## 8. Fase 5 — Plano de correção e prontidão

### 8.1 Ordem obrigatória antes de dados reais

| Ordem | Ação | IDs cobertos | Critério de saída |
| --- | --- | --- | --- |
| 1 | domínio, TLS, redirect, cookies Secure e HSTS | SEC-01, SEC-11 | HTTPS verificado em landing, CRM e API |
| 2 | rotação de root, chave SSH, firewall e remoção de portas diretas | SEC-02, SEC-03 | somente 80/443 públicos |
| 3 | backup externo criptografado e restore drill | SEC-04 | restore comprovado e alerta ativo |
| 4 | corrigir dependências auditadas | SEC-06 | audit limpo e builds/regressões verdes |
| 5 | corrigir sanitização de HTML/template e não retornar senha | SEC-07, SEC-08 | testes de XSS e inspeção de respostas passam |
| 6 | validar SMTP real | SEC-05, FUN-02 | convite, 2FA e teste chegam ao destino |
| 7 | decidir RLS/grants e retenção LGPD | SEC-09 | banco e política documentados e testados |
| 8 | rate limit Redis e E2E no CI | SEC-10, FUN-03 | proteção persiste em restart e suíte roda no deploy |
| 9 | remover 3D e corrigir acessibilidade/empty states | UI-01 a UI-06 | QA visual 390/768/1024/1440 aprovado |

### 8.2 Correções de segunda prioridade

- configurar Google Calendar e Google Business com conta de teste;
- configurar WhatsApp Business oficial e webhook HTTPS;
- configurar revalidação assinada da landing;
- comprovar downloads CSV/PDF no browser;
- remover CSS morto e migrar logs para redaction estruturado;
- documentar rollback das migrations históricas ou aceitar formalmente a limitação;
- definir retenção por entidade, base legal, responsável, exportação e anonimização LGPD;
- configurar monitoramento de saúde, expiração de certificado, backup, SMTP e espaço em disco.

### 8.3 Gates de release

#### Gate de apresentação atual — APROVADO COM RESTRIÇÕES

- [x] stack Docker na VPS;
- [x] banco novo e persistente;
- [x] health API 200;
- [x] CRM login e rotas principais;
- [x] landing 200, SEO básico e asset local;
- [x] CRM desktop/mobile sem overflow;
- [x] dados sintéticos e limpeza dos eventos de QA;
- [ ] não usar dados reais enquanto a lista de bloqueios estiver aberta.

#### Gate SLC para cliente em homologação protegida — PENDENTE

- [ ] HTTPS/domínio;
- [ ] root rotacionado e portas internas;
- [ ] backup/restore;
- [ ] SMTP verificado;
- [ ] dependências atualizadas;
- [ ] sanitização de HTML;
- [ ] senha temporária fora do JSON;
- [ ] E2E e a11y automatizados;
- [ ] mobile da landing comprovado;
- [ ] export físico comprovado.

#### Gate de produção — BLOQUEADO

O ambiente não deve ser chamado de produção até todos os itens P0 e os itens P1 de autenticação, dados, infraestrutura e entrega externa estarem comprovados em uma nova rodada.

## 9. Evidência técnica resumida

### Execuções locais

```text
pnpm --filter @viviani/api test      -> 15 arquivos / 43 testes aprovados
pnpm --filter @viviani/api lint      -> aprovado
pnpm --filter @viviani/crm lint      -> aprovado
pnpm --filter @viviani/landing lint  -> aprovado
pnpm --filter @viviani/api build     -> aprovado
pnpm --filter @viviani/crm build     -> aprovado
pnpm --filter @viviani/landing build -> aprovado
pnpm audit --prod                    -> 4 moderate, 0 high, 0 critical
```

### Execuções remotas e Brave

```text
landing HTTP                         -> 200
CRM /login                            -> 200
API /health                           -> 200; database=true, redis=true, uploads=true
API /health/ready                     -> 200; database=true, redis=true
robots.txt / sitemap.xml              -> 200 / 200
protected endpoints without auth      -> 401
public content endpoint               -> 200
CRM routes desktop                    -> 10/10 sem erro visível
CRM routes mobile 390x844             -> 10/10 sem overflow/erro visível
API read matrix                       -> 40/40
invalid mutation matrix               -> 11/11 controladas
Docker services na janela de QA       -> 6 healthy
```

### Limitações que não devem ser apagadas do histórico

- o Deep Security Scan do plugin não iniciou: `Deep Scan cannot safely start a read-only worker: the parent must provide a managed filesystem permission profile.` Não foi feita nova tentativa nem substituição por uma falsa conclusão; a auditoria manual e `pnpm audit` permanecem válidas, mas a cobertura do scanner profundo está incompleta;
- o conector de status TAC de segurança não estava conectado;
- a landing mobile não ficou comprovada nesta execução do Brave;
- downloads físicos não foram confirmados por evento de browser;
- integrações externas felizes não foram declaradas sem credenciais e eventos reais;
- não houve teste destrutivo de restore, carga, fuzzing ou invasão de produção.

## 10. Veredito final

**Para apresentação:** sim, com dados sintéticos e aviso de homologação.  
**Para entrega assistida à cliente:** sim, desde que a cliente seja informada de que SMTP, Google, WhatsApp, publicação e TLS ainda estão pendentes.  
**Para produção com dados reais:** não. Os bloqueios SEC-01, SEC-03, SEC-04, SEC-05 e SEC-06, junto com as pendências de senha temporária, sanitização e portas públicas, precisam ser resolvidos e revalidados.

O próximo passo correto é executar a Fase 5 na ordem da tabela, começando por perímetro/TLS/backup, depois autenticação/dados e somente então integrações externas e acabamento visual. Isso evita apresentar como pronto um sistema que está funcionando tecnicamente, mas ainda não está protegido operacionalmente.

---

## 11. Execução das soluções — atualização de 03/09/2026

Esta seção atualiza o snapshot da auditoria após a execução das soluções. Os achados originais foram preservados acima para manter rastreabilidade; onde houver conflito, esta seção representa o estado mais recente verificado.

### 11.1 Barra de progresso honesta

**Escopo interno executável e homologação:** `█████████████████░░░ 85%`

**Prontidão para produção com dados reais:** `██████████████░░░░░░ 70%`

O primeiro percentual mede código, testes, UI, Docker, banco e operação que puderam ser executados nesta rodada. O segundo é menor porque produção exige fatores externos ainda não disponíveis: domínio/TLS, rotação de acesso, serviços de terceiros, backup fora da VPS, restore ensaiado e prova formal de isolamento de dados. Portanto, o sistema está pronto para apresentação/homologação controlada, mas não deve ser rotulado como 100% de produção.

### 11.2 Soluções executadas

#### Segurança da aplicação

- rate limit global e de autenticação migrados para Redis compartilhado, com prefixos separados;
- bloqueio de brute force de login migrado do `Map` em memória para chaves Redis com TTL;
- sanitização centralizada de HTML rico, templates de e-mail, campanhas e biografia, com allowlist de tags e protocolos;
- senha temporária removida do JSON de resposta; o fluxo só a entrega pelo e-mail configurado;
- `TRUST_PROXY` tornou-se explícito e permanece falso por padrão;
- alertas e mutations do CRM passaram a tratar HTTP não-2xx e exibir erro operacional em vez de falhar silenciosamente;
- dependências de produção corrigidas: `pnpm audit --prod --json` retornou 0 vulnerabilidades em todas as severidades.

#### Infraestrutura e operação

- role runtime `viviani_app` criada na VPS sem `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION` ou `BYPASSRLS`;
- conexão administrativa de migração separada da conexão runtime da aplicação;
- bootstrap de banco novo bloqueado por padrão e dependente de `ALLOW_FRESH_BOOTSTRAP=true`;
- backup PostgreSQL e uploads criado com gzip, manifesto SHA-256 e retenção de 14 dias;
- backup testado com `gzip -t` e leitura do conteúdo do arquivo de uploads;
- segredo de revalidação da landing configurado internamente, com tentativa sem segredo retornando 401;
- Nginx sem exposição da versão e com headers de segurança; `X-Frame-Options` foi mantido fora do Nginx porque quebrava a pré-visualização autenticada do CRM, enquanto o CRM continua com `DENY` próprio.

#### UI/UX e acessibilidade prática

- labels e associações de campos corrigidos no perfil/configurações;
- botões de ícone do CRM receberam rótulos acessíveis;
- funnel vazio agora orienta o primeiro cadastro em vez de parecer quebrado;
- hover 3D e utilitários decorativos sem função removidos dos serviços;
- suporte global a `prefers-reduced-motion` incluído;
- menu mobile corrigido: o botão do cabeçalho não permanece duplicado sob o drawer;
- CSP do CRM passou a aceitar a origem WebSocket da API para preservar o Socket.IO;
- landing verificada visualmente no Brave em desktop e em viewport 390x844: HERO carregado, CTA visível, campos sem corte, sem overflow horizontal, sem erros ou warnings de console.

### 11.3 Evidência final desta atualização

```text
API Vitest                         -> 16 arquivos / 48 testes aprovados
API TypeScript build              -> aprovado
CRM build                         -> aprovado; 20 rotas
Landing build                     -> aprovado; 10 rotas
API/CRM/Landing lint              -> aprovados
pnpm audit --prod                 -> 0 vulnerabilidades
VPS Docker build/recreate         -> API, CRM e landing construídos; seis serviços healthy
API /health                       -> 200; database=true, redis=true, uploads=true
API /health/ready                 -> 200; database=true, redis=true
Prisma migrations na VPS          -> 6 migrations; schema up to date
Rate limit público                -> headers RateLimit-* presentes
Landing e CRM                     -> HTTP 200
Landing Brave desktop             -> HERO completo, sem overflow, sem console error/warning
Landing Brave 390x844             -> sem overflow; menu e CTA funcionais; HERO completo
CRM login Brave                   -> placeholders `Usuário` e `Senha`, sem overflow
Backup remoto                     -> 20260903T175333Z; PostgreSQL/uploads criados e integridade conferida
```

### 11.4 Pendências abertas e solução forte

| ID | Estado atual | Solução forte necessária antes de produção |
| --- | --- | --- |
| SEC-01 | ABERTO | Registrar domínio, emitir certificado TLS, forçar redirect HTTPS e validar cookies/headers em hostname real. |
| SEC-03 | ABERTO | Revogar a credencial root usada nesta implantação, instalar chave SSH nominal, desabilitar senha/root remoto e registrar acesso individual. |
| SEC-04 | PARCIAL | Backup local, manifesto SHA-256 e restore isolado foram preparados/testados; falta storage externo real, criptografia, retenção e agendamento operacional. |
| SEC-05 | ABERTO | Configurar SMTP real com conta da cliente e executar convite, 2FA, confirmação e falha controlada com evidência de entrega. |
| SEC-06 | PARCIAL | `pnpm audit --prod` está limpo; ainda existe manutenção de versões deprecated, incluindo Multer/ESLint e transitive dependencies. |
| SEC-07 | PARCIAL | Sanitização de API e renderer editorial da landing fecham os caminhos testados; ampliar testes de legado, templates e scanner especializado. |
| SEC-08 | FECHADO NO RETORNO HTTP | Senha temporária não é mais devolvida em JSON; manter rotação de segredos e validar entrega somente pelo canal configurado. |
| SEC-09 | PARCIAL | RLS e role runtime foram comprovadas no single-tenant; isso não equivale a isolamento multi-tenant e exige decisão formal. |
| SEC-10 | FECHADO NO CÓDIGO/HML | Rate limit e brute force usam Redis compartilhado; monitorar chaves, alertas e comportamento sob múltiplas instâncias em produção. |
| FUN-01 | PARCIAL | Downloads físicos de leads, financeiro, disparos e segurança passaram no Brave; completar exports restantes, autorização negativa e conteúdo. |
| FUN-02 | ABERTO | Configurar Google Calendar/Business, WhatsApp e SMTP reais; executar evento feliz e falhas controladas sem dados pessoais. |
| FUN-03 | PARCIAL | Playwright autenticado percorre dez módulos em desktop/mobile e quatro famílias de export; faltam mutações, perfis negativos, 2FA e CI. |
| UI-06 | FECHADO NO ESCOPO TESTADO | Landing/login passaram Brave desktop/mobile e axe; manter regressão em CI e ampliar navegadores/dispositivos quando o domínio existir. |

### 11.5 Limites que continuam válidos

- o Deep Security Scan não iniciou porque o ambiente não forneceu o perfil de filesystem gerenciado exigido; não foi declarado como concluído;
- não houve invasão, fuzzing, teste de carga ou restore destrutivo em dados de produção;
- integrações externas não foram declaradas funcionando sem credenciais e eventos reais;
- o ambiente público continua acessível por IP e HTTP para apresentação, deliberadamente fora do padrão de produção;
- os dados atuais continuam sintéticos/de demonstração.

### 11.6 Veredito operacional

**Apresentação:** aprovado na VPS por IP, com Docker, banco persistente, health checks, landing e CRM verificados.

**Homologação controlada:** aprovado, desde que permaneça com dados sintéticos e os itens abertos sejam tratados como restrições explícitas.

**Produção com dados reais:** ainda bloqueado. O que falta não é scaffolding: são gates operacionais e externos que precisam de credenciais, domínio, política de acesso e evidência de recuperação.

## 12. Snapshot vinculante após a revalidação final — 03/09/2026

Esta seção consolida o estado vigente após a execução das correções e substitui qualquer leitura anterior deste documento que diga que os itens abaixo ainda não foram implementados.

### 12.1 Implementações concluídas nesta rodada

- CSP da landing endurecida: `unsafe-eval` removido.
- Falha de banco em `auto-templates` deixou de ser mascarada como lista vazia com `200`; a falha agora é registrada e entregue ao handler HTTP. A listagem da agenda também usa logger estruturado, sem `console.error`.
- Biografia pública deixou de ser injetada diretamente com `dangerouslySetInnerHTML`. O renderer de rich text aceita somente tags editoriais e protocolos de link seguros; a API sanitiza o valor também na leitura pública.
- Playwright autenticado foi consolidado em um login por viewport e cobre dez rotas do portal e downloads físicos de leads, financeiro, disparos e segurança.
- Cobertura de rotas ampliada com testes de autenticação, gerenciamento de usuários e conteúdo: username case-insensitive, 2FA por e-mail, troca de senha, não exposição de senha temporária, autoexclusão, sanitização pública e templates automáticos.
- Conta administrativa QA criada somente no processo de homologação, sem dados de cliente, e removida ao final com seus registros de auditoria; consulta final não encontrou contas QA residuais.

### 12.2 Evidências reproduzidas

| Área | Evidência atual | Resultado |
|---|---|---|
| Testes API | `pnpm test` | 61/61 aprovados em 19 arquivos |
| Cobertura | `pnpm --filter @viviani/api test:coverage` | 61/61; 32,85% de linhas — ainda não é 100% |
| Lint | `pnpm lint` | 7/7 pacotes aprovados |
| Build | `pnpm exec turbo run build --force` | API, CRM, landing e pacotes compartilhados aprovados |
| Supply chain | último `pnpm audit --prod --json` concluído antes desta rodada sem vulnerabilidades | zero vulnerabilidades reportadas; nenhuma dependência foi alterada nesta correção |
| HML Docker | preflight + smoke na VPS | aprovados; seis serviços `healthy` |
| HML público | health/readiness, CSP, login e `auto-templates` sem autenticação | health/readiness `200`; CSP sem `unsafe-eval`; `auto-templates` `401` |
| Brave público | desktop/mobile | 10 pass, 2 skips condicionais por credenciais ausentes |
| Brave autenticado | desktop/mobile com QA efêmero | 3/3 aprovados por viewport; navegação sem API 4xx/5xx/overflow e downloads físicos válidos |
| Operação local | portas `3000`, `3001`, `4000` | nenhum listener localhost |

### 12.3 Pendências que não podem ser simuladas pelo código

| Fase | Gate | Estado | Evidência necessária |
|---|---|---|---|
| Produção 1 | domínio, DNS, TLS/443 e redirect | ABERTO P0 | hostname real, certificado válido, renovação e teste externo |
| Produção 2 | firewall, SSH e rotação da credencial usada | ABERTO P0 | chave nominal, senha revogada, portas restritas a 80/443 e registro de acesso |
| Produção 3 | backup externo/criptografado/agendado | PARCIAL P0 | volume externo real, retenção, timer ativo, restore isolado formalmente aceito |
| Produção 4 | integrações | ABERTO P0 | SMTP, Google e WhatsApp da cliente, com eventos felizes e falhas controladas |
| Produção 5 | LGPD e retenção | ABERTO P1 | finalidade, base legal, prazo, atendimento e aceite da responsável |
| Produção 6 | isolamento | PARCIAL P0/P1 | decisão single-tenant formal ou tenant/RLS real com teste de não-vazamento |
| Produção 7 | carga e observabilidade | ABERTO P1/P2 | SLO, teste sem dados reais, alertas externos e responsável de plantão |
| Produção 8 | segurança especializada | BLOQUEADO POR FERRAMENTA P1 | execução em ambiente compatível ou auditoria equivalente assinada |

### 12.4 Veredito

**Homologação controlada:** apta para apresentação com dados sintéticos, Docker na VPS e operação supervisionada.

**Produção:** não liberada. O código e a homologação foram endurecidos, mas não existe autorização técnica honesta para declarar 100% antes dos gates externos acima. A promoção deve ser bloqueada pelo `preflight.sh` até que cada evidência seja anexada e o smoke seja repetido em HTTPS.
