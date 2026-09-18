# Mapa de homologação e produção a 100%

**Projeto:** VivianiCRM  
**Cliente:** Viviani Serena  
**Data da coleta:** 03/09/2026  
**Classificação:** documento operacional interno — sistema crítico com dados pessoais, financeiros, credenciais, tokens OAuth e trilhas de auditoria  
**Base principal:** [`docs/24_AUDITORIA_COMPLETA_SLC_2026-09-03.md`](./24_AUDITORIA_COMPLETA_SLC_2026-09-03.md)

> Este documento é o mapa de fechamento do SLC. Ele registra o estado comprovado, os bloqueios restantes, a ordem de execução e os critérios objetivos para liberar homologação e produção. Percentuais são indicadores gerenciais de avanço; não substituem evidência nem aprovação formal.

> **Status vinculante da coleta final — 03/09/2026, 20:11 UTC:** homologação controlada/apresentação **APROVADA COM RESTRIÇÕES**; produção real **BLOQUEADA**. A seção 23 supersede os estados anteriores deste documento. Não há autorização técnica para inserir dados reais enquanto TLS, rotação de segredos, backup externo/restore, integrações reais e aceite formal permanecerem abertos.

## 1. Veredito executivo

O sistema está operacional em uma VPS self-hosted, com Docker, PostgreSQL, Redis, API, CRM, landing page e Nginx saudáveis. A apresentação visual da landing e do login do CRM foi verificada no Brave em desktop e mobile; a correção do menu mobile também foi validada.

Ainda não é correto declarar produção a 100%. Os bloqueios mais relevantes são:

- não há TLS ativo; o acesso atual é HTTP por IP;
- na homologação, o Nginx mantém as portas de apresentação `3001` e `4000`; API e CRM não publicam bindings próprios; em produção o perfil limita o perímetro a `80/443`;
- cookies seguros e HSTS estão desativados no ambiente atual de apresentação;
- RLS single-tenant foi aplicada em 16 tabelas, mas isso ainda não é isolamento entre organizações;
- o comando de cobertura funciona, porém a cobertura de linhas medida é 32,85%, não 100%;
- Playwright/axe cobre a landing e o CRM autenticado percorre dez rotas em desktop/mobile; mutações, permissões negativas e integrações ainda não estão cobertas;
- SMTP, Google Calendar/Business e WhatsApp Business ainda não foram comprovados com credenciais reais;
- o restore isolado do banco e a cópia externa temporária foram validados, mas storage externo real, criptografia, retenção e agendamento ainda não foram ativados;
- Playwright e axe foram atualizados e validados; ainda há dívida de manutenção em `multer`, ESLint e dependências de desenvolvimento/transitivas, que exige janela própria de compatibilidade;
- o security scan especializado não foi concluído por limitação do ambiente de execução.

### 1.1 Estado atual versus objetivo

| Área | Estado comprovado | Objetivo 100% | Situação |
|---|---|---|---|
| Aplicação e containers | Seis serviços saudáveis no Docker | Saúde persistente, reinício seguro e observabilidade | Parcial |
| Homologação visual | Landing e login revisados no Brave desktop/mobile | Todas as telas e fluxos do CRM validados | Parcial |
| Testes de unidade/API | 61/61 testes; Brave público 10 pass/2 skipped; CRM autenticado 3/3 por viewport | Cobertura de linhas, integração e E2E completo | Parcial |
| Build e lint | Passando | Pipeline reproduzível e bloqueante | Concluído localmente |
| Dependências de produção | `pnpm audit --prod` sem vulnerabilidades reportadas | Risco acompanhado e upgrades controlados | Parcial |
| Banco | Schema atualizado; RLS em 16 tabelas e 16 policies single-tenant | Isolamento formal, rollback e restore ensaiados | Parcial |
| Perímetro | Nginx HTTP funcionando | TLS, firewall, proxy interno e headers finais | Bloqueado |
| Integrações | Código presente | Credenciais reais, testes de ida/volta e falhas | Bloqueado |
| Backup | Backup local íntegro confirmado por SHA-256 | Cópia externa + restauração comprovada | Parcial |
| Produção | Não liberada | Go-live com aceite, rollback e monitoramento | Bloqueado |

### 1.2 Percentual de avanço

| Marco | Estimativa atual | O que falta para 100% |
|---|---:|---|
| Homologação interna/controlada | **APROVADA COM RESTRIÇÕES** | Mutações, permissões negativas, integrações reais, downloads além das quatro famílias testadas, restore e aceite formal |
| Produção real | **BLOQUEADA** | TLS/perímetro, rotação, isolamento formal, restore externo, integrações, observabilidade e go-live controlado |

Esses números são herdados do fechamento da auditoria anterior e servem somente para gestão. Um único bloqueio crítico impede a liberação, mesmo que o percentual agregado pareça alto.

## 2. Escopo e limites da coleta

### Incluído

- repositório completo e documentação operacional;
- API Express/Prisma;
- CRM Next.js;
- landing page Next.js;
- Docker Compose e imagens de produção;
- PostgreSQL, Redis, Nginx, volumes e scripts de backup/restore;
- autenticação, usuários, permissões, leads, agenda, financeiro, conteúdo, analytics, privacidade e segurança;
- inspeção de dependências, migrations, build, lint, testes e saúde remota;
- revisão visual no Brave em desktop e viewport mobile;
- conectividade local da VPS e respostas HTTP/health checks.

### Não comprovado nesta coleta

- entrega real de e-mail SMTP;
- OAuth e chamadas reais do Google Calendar/Business;
- webhook e envio real do WhatsApp Business;
- download físico de cada tipo de exportação;
- restauração integral em uma segunda instalação isolada;
- teste de carga representativo;
- pentest externo/autorizado;
- proteção completa por RLS e isolamento entre organizações;
- segurança do host após rotação das credenciais recebidas;
- publicação via domínio/TLS, porque o domínio ainda não foi configurado.

Não há afirmação de aprovação para um item sem sua evidência correspondente.

## 3. Mapa técnico do ambiente

### 3.1 Topologia atual

```text
Navegador da cliente
        |
        | HTTP :80
        v
     Nginx
      /   \
     /     \
Landing   CRM
 :3000    :3001
             |
             | HTTP/WebSocket para API
             v
           API :4000
          /          \
         /            \
 PostgreSQL :5432   Redis :6379
```

O banco e o Redis ficam acessíveis pela rede interna do Compose. API e CRM, entretanto, também estão publicados no host em `0.0.0.0:4000` e `0.0.0.0:3001`, o que é aceitável apenas como configuração temporária de apresentação e não como perímetro final de produção.

### 3.2 Serviços e responsabilidades

| Serviço | Função | Exposição atual | Critério final |
|---|---|---|---|
| `nginx` | entrada HTTP, roteamento e headers | host :80 | único ponto público, com TLS |
| `landing` | site público | rede Docker; publicado por Nginx | sem porta pública direta |
| `crm` | portal autenticado | host :3001 e Nginx | sem porta pública direta |
| `api` | REST, autenticação, uploads, integrações e WebSocket | host :4000 e Nginx | sem porta pública direta |
| `postgres` | persistência | rede Docker | sem publicação no host |
| `redis` | rate limit, sessões/estado auxiliar e locks | rede Docker | sem publicação no host |

### 3.3 Dados e modelo atual

O banco possui 17 tabelas públicas observadas na coleta, incluindo usuários, sessões, leads, appointments, financials, contents, versões de conteúdo, templates, analytics, consentimentos, eventos de segurança, logs de auditoria e configurações de e-mail.

O projeto contém autorização no nível da aplicação e papéis de usuário, mas a coleta encontrou:

- `relrowsecurity=false` e `relforcerowsecurity=false` em todas as tabelas públicas;
- zero policies PostgreSQL;
- nenhum modelo de organização/tenant identificado no schema atual;
- usuário runtime `viviani_app` sem superuser, createdb, createrole, replication ou bypassrls;
- usuário administrativo do banco ainda presente com privilégios elevados.

Isso reduz o impacto de uma exploração via conexão runtime, mas não substitui RLS, isolamento de tenant, revisão de autorização e hardening do ciclo de vida dos dados.

### 3.4 Stack observada

| Componente | Observado |
|---|---|
| Node | 20.20.2 na execução operacional |
| pnpm | 8.15.4 |
| Next.js | 15.5.25 no código instalado |
| API | Express + Prisma + TypeScript |
| Frontends | Next.js App Router + Tailwind + componentes shadcn/ui |
| Infraestrutura | Docker Compose + Nginx + PostgreSQL + Redis |
| Documentação | Há referências históricas a Next.js 14; isso precisa ser corrigido para evitar release baseado em informação stale |

## 4. Inventário funcional

### 4.1 Núcleo da API

As áreas identificadas no backend são:

- autenticação, sessão, logout, alteração de senha, recuperação e 2FA;
- usuários, colaboradores, papéis e ativação/desativação;
- leads, filtros, status, arquivamento e histórico;
- agenda, appointments, duração, conflitos e integração externa;
- financeiro, registros e arquivamento;
- conteúdos, versões, publicação, preview e revalidação do site;
- templates e automações de comunicação;
- dispatches/e-mails e configurações SMTP;
- dashboard, métricas e analytics;
- exportações e privacidade;
- segurança, eventos, auditoria, status e health checks;
- webhook do WhatsApp e conectividade de integrações.

### 4.2 Portal CRM

As áreas de interface que precisam entrar na matriz de homologação são:

- login e sessão expirada;
- dashboard;
- leads e detalhes do lead;
- agenda/calendário e criação/edição/cancelamento;
- financeiro;
- conteúdo/editor do site;
- colaboradores e usuários;
- configurações;
- segurança/2FA;
- exportações, privacidade e exclusão/arquivamento;
- estados de carregamento, vazio, erro, sem conexão, rate limit e permissão negada.

### 4.3 Landing page

O fluxo público contém navegação, hero, seções editoriais, serviços, provas/conteúdo, contato e rodapé. A revisão visual atual confirmou o caráter editorial da página, imagens carregando corretamente no estado observado, ausência dos elementos decorativos genéricos com aparência de IA e funcionamento do menu mobile sem a sobreposição anteriormente encontrada.

### 4.4 Integrações externas

| Integração | Uso esperado | Evidência ainda necessária |
|---|---|---|
| SMTP | envio de recuperação, convites e comunicação | e-mail entregue, bounce/falha, timeout e logs sem segredo |
| Google Calendar/Business | agenda e sincronização | OAuth real, refresh token, criar/editar/cancelar, revogar acesso |
| WhatsApp Business | mensagens e webhook | challenge GET, assinatura HMAC POST, envio, status e idempotência |
| Upload local | imagens, arquivos e exportações | MIME/magic bytes, limite, armazenamento, download e expiração |
| Analytics | métricas públicas/consentimento | consentimento, opt-out, payload mínimo e retenção |

## 5. Fase 0 — congelamento, governança e inventário de release

**Objetivo:** garantir que o que será homologado é identificável, reproduzível e recuperável.

### Ações

- congelar o escopo do release candidato e registrar branch, commit, imagens e checksum;
- confirmar que a base é nova e que nenhum dado antigo será migrado;
- manter `FRESH_DATABASE=false` no ambiente já inicializado;
- nunca executar `docker compose down -v` no ambiente que contém o banco ou uploads;
- catalogar variáveis de ambiente por ambiente, sem salvar valores secretos no repositório;
- definir responsáveis por produto, infraestrutura, banco, segurança e aceite da cliente;
- rotacionar credenciais da VPS antes de inserir dados reais;
- usar chaves SSH, bloquear login root por senha quando houver acesso alternativo validado e restringir firewall;
- criar manifesto de release e registro de alterações;
- definir janela de mudança, ponto de restauração e critério de rollback.

### Evidência de aceite

- commit/tag do release candidato;
- inventário de imagens Docker;
- cópia segura de `.env` fora do Git;
- backup com checksum;
- matriz de responsáveis e contatos;
- plano de rollback ensaiado em ambiente não produtivo.

### Bloqueio atual

O ambiente de apresentação está saudável, mas ainda não existe um pacote de release formal com aceite, domínio, TLS, backup externo e restauração isolada.

## 6. Fase 1 — ambiente de homologação controlada

**Objetivo:** provar os fluxos completos sem colocar dados reais em risco.

### Desenho recomendado

Manter homologação e produção como instalações separadas, com:

- Compose, arquivo `.env` e volumes distintos;
- banco e Redis próprios;
- credenciais próprias e sem reutilização de tokens de produção;
- dados sintéticos identificáveis;
- endereço de homologação separado, preferencialmente subdomínio com TLS;
- acesso administrativo restrito por allowlist, VPN ou autenticação adicional;
- logs e backups separados.

Se a mesma VPS for usada temporariamente, os ambientes devem ter redes, volumes, projetos Compose e portas internas distintos. O alvo preferível é uma instância separada para produção, porque falha de recurso ou erro operacional em homologação não pode derrubar o sistema da cliente.

### Fluxos mínimos de homologação

| Fluxo | Cenário feliz | Cenário negativo |
|---|---|---|
| Login | usuário e senha válidos, sessão persistente | senha inválida, lockout, sessão expirada, logout |
| Primeiro acesso | senha temporária exige troca | tentativa de continuar sem trocar |
| Usuários | criar, editar, desativar, papel | usuário sem permissão, duplicidade, escalada de privilégio |
| Leads | criar, buscar, editar, arquivar, restaurar se aplicável | payload inválido, ID inexistente, acesso indevido |
| Agenda | criar, editar, cancelar, conflito e duração | data inválida, conflito, integração indisponível |
| Financeiro | lançar, listar, filtrar, arquivar | valores inválidos, acesso sem papel, download incompleto |
| Conteúdo | editar, versionar, preview, publicar | concorrência, revalidação indisponível, conteúdo inválido |
| E-mail | convite/recuperação/configuração | SMTP indisponível, credencial inválida, retry seguro |
| 2FA | ativar, validar, backup/recovery e desativar | código expirado, replay e tentativa bloqueada |
| Exportação | gerar, baixar e conferir conteúdo | sem autorização, arquivo ausente, expiração |
| Privacidade | consentimento, exportação e solicitação | usuário inexistente, duplicidade, dados excessivos |
| Integrações | conectar, usar e desconectar | token expirado, revogação e retry |

### Critérios de saída

- todos os fluxos da matriz executados com evidência;
- nenhum defeito P0/P1 aberto;
- defeitos P2 com responsável, prazo e aceite explícito;
- dados sintéticos removidos ou ambiente preservado para auditoria;
- API, CRM, landing, banco e Redis reiniciados e revalidados;
- cobertura, E2E e acessibilidade automatizada executadas;
- aceite funcional da responsável pelo negócio.

## 7. Fase 2 — banco, isolamento e integridade de dados

**Objetivo:** impedir exposição ou alteração indevida e tornar mudanças reversíveis.

### 7.1 Decisão estrutural obrigatória

O produto deve escolher e documentar uma destas posições:

1. **Single-tenant permanente:** declarar formalmente que a instalação pertence a uma única organização, remover qualquer promessa de multi-tenant, reforçar autorização por papel e manter o banco isolado por cliente; ou
2. **Multi-tenant preparado para crescimento:** adicionar `organization_id`/equivalente às entidades sensíveis, associação de usuários, índices, constraints, policies RLS por organização e testes de isolamento.

Para um CRM que pode atender mais de uma operação, a solução forte é a segunda. Não basta ativar RLS sem coluna de escopo e sem testar tentativas de leitura, alteração, exportação e download cruzado.

### 7.2 RLS e autorização

- habilitar RLS nas tabelas que armazenam dados pessoais, financeiros, sessões, conteúdos privados, auditoria e tokens;
- criar policies deny-by-default e permitir apenas o escopo correto;
- não confiar em `user_id` vindo do cliente;
- derivar identidade e organização da sessão validada;
- testar cada papel contra cada recurso e cada ação;
- testar acesso horizontal usando IDs de outro usuário/organização;
- revisar downloads, previews, uploads, exportações e endpoints de métricas, não apenas listagens;
- manter o runtime com privilégio mínimo e verificar que migrations/admin não usam a mesma credencial de runtime.

### 7.3 Migrations e rollback

Há seis migrations aplicadas. Somente duas possuem `rollback.sql`:

- `20260901090000_preserve_operational_history`;
- `20260901110000_add_usernames`.

Estas quatro precisam de reversão documentada e validada antes de release:

- `20260319151500_two_factor_channels`;
- `20260319213000_email_settings`;
- `20260323120000_appointment_duration_minutes`;
- `20260323200000_add_lead_status_templates`.

O rollback deve ser testado em cópia do banco, com verificação de dados antes/depois. Se uma migration não puder ser revertida sem perda, isso deve ser declarado no runbook e substituído por procedimento de restauração/forward-fix; não pode ficar implícito.

### 7.4 Backup e restauração

- manter backup de PostgreSQL e uploads;
- enviar cópia criptografada para armazenamento externo independente da VPS;
- proteger chaves de criptografia fora do host;
- testar restauração em banco e volume novos;
- conferir contagem, constraints, arquivos, permissões e login após restore;
- registrar RPO/RTO aprovados.

**Padrão inicial proposto:** RPO máximo de 24 horas e RTO máximo de 4 horas, a ajustar com a cliente conforme impacto operacional. Sem aceite desses números, “backup configurado” não equivale a continuidade de negócio.

### Critérios de saída

- decisão single-tenant/multi-tenant registrada;
- RLS/policies e testes de isolamento passando, ou single-tenant formalmente aprovado;
- todas as migrations com reversão ou procedimento de recuperação documentado;
- restore completo ensaiado fora do banco original;
- backup externo recente, íntegro e acessível apenas aos responsáveis.

## 8. Fase 3 — segurança do perímetro e da aplicação

**Objetivo:** remover a configuração de demonstração e estabelecer um perímetro de produção.

### 8.1 VPS, rede e acesso

- configurar domínio e certificado TLS válido no Nginx;
- redirecionar HTTP para HTTPS;
- ativar HSTS somente depois de confirmar que todos os subdomínios necessários funcionam em HTTPS;
- ativar `COOKIE_SECURE=true` e manter `SameSite`/escopo de domínio revisados;
- restringir portas públicas a `80/443` conforme necessidade;
- remover a publicação direta de `3001` e `4000`, ou bloquear essas portas no firewall;
- preferir bind interno/loopback para CRM e API, com Nginx como único ingresso;
- não publicar PostgreSQL nem Redis;
- aplicar firewall de host e, se disponível, firewall do provedor;
- desabilitar login root por senha após validar chave administrativa alternativa;
- instalar atualizações de segurança do sistema e definir janela de patch;
- revisar usuários, processos, chaves, cron, Docker socket e permissões de volumes.

### 8.2 Cabeçalhos, CORS e CSP

- trocar origens genéricas por allowlist exata do domínio final;
- confirmar CSP em landing, CRM, API e WebSocket após TLS;
- retirar `ws://` e usar `wss://` quando o domínio estiver protegido;
- validar `frame-ancestors`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e MIME sniffing;
- garantir que o preview/editor não exija relaxamento global do CSP;
- manter Swagger/documentação restrita a ambiente autorizado;
- testar preflight CORS e impedir origens arbitrárias.

### 8.3 Sessão, autenticação e abuso

- testar login, lockout distribuído, rate limit e expiração em múltiplas instâncias;
- confirmar que Redis indisponível falha de modo seguro e não libera autenticação;
- revisar rotação/invalidação de sessão após troca de senha e alteração de papel;
- verificar cookies, CSRF e origem em mutações;
- revisar 2FA, códigos de recuperação, replay e suporte operacional;
- rotacionar tokens OAuth e segredos existentes antes dos dados reais;
- garantir que logs nunca imprimam senha, token, cookie ou payload sensível completo.

### 8.4 Uploads, exports e conteúdo

- validar tamanho, extensão, MIME declarado e magic bytes;
- impedir arquivos executáveis ou interpretações pelo servidor;
- usar nome gerado, path seguro e autorização no download;
- considerar host/rota de arquivos separado do HTML;
- adicionar expiração/limpeza para temporários;
- testar exportações com dados vazios, grandes, caracteres especiais e tentativa cruzada;
- sanitizar HTML, URLs e conteúdo rico no servidor e na renderização.

### 8.5 Security scan especializado

O fluxo do plugin de security scan não foi concluído: o preflight indicou ausência de workers delegáveis, e a tentativa anterior de Deep Scan foi bloqueada pelo perfil de filesystem gerenciado exigido pelo worker. Isso é uma limitação de evidência, não uma aprovação de segurança.

### Critérios de saída

- TLS validado externamente e internamente;
- somente Nginx exposto;
- flags finais (`COOKIE_SECURE`, HSTS, proxy confiável e CORS) comprovadas;
- scan automatizado completo ou revisão equivalente documentada;
- nenhuma vulnerabilidade crítica/alta sem aceite formal de risco;
- rotação de credenciais concluída.

## 9. Fase 4 — integrações reais e conectividade

**Objetivo:** substituir “código pronto” por comprovação de ida, volta, falha e recuperação.

### SMTP

- configurar servidor, remetente e domínio autorizado;
- testar convite, recuperação e comunicação normal;
- validar SPF, DKIM e DMARC do domínio quando disponível;
- testar credencial inválida, timeout, rejeição e retry;
- conferir que o usuário não recebe senha permanente em resposta ou log;
- registrar message-id e status sem registrar segredo.

### Google Calendar/Business

- cadastrar redirect URI de homologação e produção separadamente;
- conectar com conta de teste;
- criar, editar, cancelar e consultar evento;
- testar timezone, duração, conflito e perda de conectividade;
- expirar/revogar refresh token e confirmar comportamento seguro;
- desconectar e confirmar remoção/invalidade do vínculo;
- conferir que tokens ficam cifrados ou protegidos conforme o desenho aprovado.

### WhatsApp Business

- validar challenge GET do webhook;
- validar assinatura HMAC no POST;
- rejeitar assinatura inválida e replay quando aplicável;
- testar recebimento, envio, status, timeout e retry idempotente;
- confirmar que logs não exibem tokens ou conteúdo além do necessário;
- separar número/app de homologação e produção.

### Publicação do site e analytics

- testar preview, publicação, revalidação e rollback de versão;
- confirmar cache sem expor rascunho;
- validar consentimento, opt-out, minimização de dados e retenção;
- confirmar que a landing continua funcionando sem cookies não essenciais.

### Critérios de saída

Cada integração precisa de evidência contendo data, ambiente, identificador não sensível, resultado feliz, resultado de falha, comportamento de retry e procedimento de desconexão. A existência de variáveis preenchidas não é evidência de conectividade.

## 10. Fase 5 — estratégia de testes e qualidade funcional

**Objetivo:** provar o sistema por camadas, com repetição automatizada e evidência rastreável.

### Estado atual

- `pnpm test`: passou, com 16 arquivos e 48 testes da API;
- `pnpm lint`: passou nos sete pacotes do workspace;
- `pnpm build`: passou para API, CRM e landing;
- `pnpm audit --prod --json`: nenhuma vulnerabilidade info/low/moderate/high/critical reportada para 494 dependências;
- `pnpm --filter @viviani/api test:coverage`: falhou porque `@vitest/coverage-v8` não está instalado;
- `pnpm outdated --recursive`: há atualizações disponíveis para ferramentas e dependências; a atualização ampla permanece fora desta janela para evitar misturar mudanças de runtime.

### Camadas obrigatórias

| Camada | O que deve cobrir | Saída exigida |
|---|---|---|
| Unitária | sanitização, regras, validação, datas, permissões | testes rápidos e determinísticos |
| Integração | API + PostgreSQL + Redis reais | migrations, transações, lockout, rate limit e falhas |
| Contrato | API/CRM, payloads, status e erros | contrato versionado e breaking changes detectadas |
| E2E | fluxos de cliente e administradores | Playwright em ambiente isolado |
| Segurança negativa | IDOR, escalada, CORS, CSRF, uploads, brute force | casos que devem ser recusados |
| Acessibilidade | teclado, foco, labels, contraste, leitor | axe + inspeção manual |
| Resiliência | restart, Redis/SMTP/API indisponíveis | recuperação sem corrupção ou vazamento |
| Carga | login, dashboard, listagens e exportação | latência/erro dentro do alvo aprovado |

### Ações de teste

- instalar e fixar `@vitest/coverage-v8` na versão compatível;
- publicar thresholds mínimos para código crítico, sem mascarar arquivos não testados;
- criar Playwright para login, troca de senha, papéis, leads, agenda, financeiro, conteúdo, exportação e logout;
- executar E2E contra Docker, não contra mocks quando a intenção for validar conectividade;
- adicionar fixtures sintéticas e reset seguro entre testes;
- cobrir respostas 401, 403, 404, 409, 422, 429 e 5xx;
- testar concorrência em agenda, publicação e operações idempotentes;
- validar physical download dos exports no navegador;
- guardar relatório JUnit/HTML, screenshot e trace apenas no artefato de CI, sem dados reais;
- definir alvo de carga após obter volume esperado da cliente.

### Critérios de saída

- zero falha bloqueante em CI;
- cobertura instrumentada passando;
- E2E verde no ambiente de homologação;
- casos negativos e de permissão passando;
- defeitos catalogados com severidade, evidência e decisão.

## 11. Fase 6 — auditoria completa de UI/UX e acessibilidade

**Objetivo:** garantir que o CRM principal seja utilizável, legível e consistente em cenários reais.

### Evidências já obtidas

- landing desktop visualmente conferida no Brave;
- landing mobile em viewport de 390 px sem overflow horizontal;
- hero carregado sem o atraso cinza observado anteriormente no estado validado;
- menu mobile corrigido: estado fechado com um controle de abertura, estado aberto com um controle de fechamento e sem sobreposição;
- login mobile do CRM visualmente conferido, com `Usuário` e `Senha` completos e sem clipping;
- console sem erros ou warnings observados nas páginas verificadas.

### Cobertura que ainda falta

Repetir a verificação em todas as telas do CRM nos seguintes tamanhos:

- 320, 360, 390 e 430 px;
- 768 px;
- 1024 px;
- 1280/1440 px.

Para cada rota, conferir:

- nenhum elemento fora da viewport ou sobreposto;
- labels, placeholders, mensagens e botões completos;
- ordem de foco e navegação apenas por teclado;
- foco visível, escape e retorno de foco em modais/drawers;
- touch targets adequados;
- contraste de texto, borda, estado de erro e estado desabilitado;
- loading, vazio, erro, offline, 403, 404 e 429;
- tabelas, filtros, cards e gráficos sem perda de informação;
- datas, moeda e timezone coerentes;
- reduced motion respeitado;
- alt text e semântica de headings;
- download, impressão e exportação percebidos pelo usuário;
- ausência de ícones, emojis ou ornamentos que passem aparência genérica de IA quando não tiverem função de produto.

### Critérios de saída

- Playwright/axe sem violações críticas ou sérias;
- revisão manual por teclado em todo o CRM;
- aprovação visual da cliente ou responsável de produto;
- screenshots de referência do release candidato;
- imagens e fontes sem regressão de performance perceptível.

## 12. Fase 7 — observabilidade, operação e recuperação

**Objetivo:** saber que algo falhou, reagir e recuperar sem depender de inspeção manual ad hoc.

### Entregas

- health check público mínimo e readiness protegido conforme risco;
- monitoramento externo de HTTPS, landing, login e API;
- alertas para container unhealthy, restart loop, disco, memória, CPU, banco, Redis, TLS e expiração de backup;
- logs centralizados ou encaminhados para fora da VPS;
- retenção de logs definida e sem PII desnecessária;
- request ID/correlation ID entre Nginx, API e integrações;
- métricas de login, erro, latência, fila/e-mail, agenda, publicação e exportação;
- dashboard operacional para a responsável técnica;
- runbook de incidentes, rollback, restore, rotação de segredo e indisponibilidade de integração;
- teste periódico de restauração e simulação de perda de container.

### Critérios de saída

Uma pessoa que não participou do desenvolvimento deve conseguir detectar indisponibilidade, identificar o serviço afetado, restaurar o último ponto aprovado e registrar o incidente seguindo o runbook.

## 13. Fase 8 — fechamento formal da homologação

**Objetivo:** transformar o ambiente validado em release aprovado pela cliente.

### Ordem de execução

1. publicar release candidate em homologação;
2. aplicar migrations em banco de homologação;
3. executar smoke técnico;
4. executar suíte unitária, integração, E2E, segurança negativa e a11y;
5. testar integrações reais com contas/números de homologação;
6. executar roteiro de aceite funcional com a cliente;
7. registrar defeitos e decisões;
8. reexecutar regressão após cada correção;
9. congelar commit, imagens, variáveis e fixtures aprovadas;
10. emitir termo de aceite ou lista explícita de riscos aceitos.

### Roteiro mínimo de aceite da cliente

- entrar no CRM e alterar a senha;
- criar e acompanhar um lead;
- consultar e editar um agendamento;
- lançar e consultar um registro financeiro;
- editar, visualizar e publicar conteúdo;
- verificar colaborador/papel e uma ação negada;
- configurar ou testar comunicação;
- gerar e baixar uma exportação;
- revisar landing em desktop e celular;
- encerrar sessão e confirmar comportamento ao voltar ao sistema.

### Não liberar homologação como 100% se

- houver fluxo crítico testado apenas por mock;
- o download não tiver sido aberto e conferido;
- houver permissão não testada;
- houver integração marcada como “configurada” sem transação real;
- a cliente não tiver assinado o aceite ou os riscos restantes.

## 14. Fase 9 — checklist de go-live de produção

**Objetivo:** publicar a versão aprovada com possibilidade real de retorno.

### Pré-go-live

- [ ] domínio e DNS apontam para o destino correto;
- [ ] TLS emitido, renovação automática testada e HTTPS validado;
- [ ] firewall permite somente o necessário;
- [ ] portas 3001/4000 não estão publicamente acessíveis;
- [ ] `.env` de produção revisado por duas pessoas autorizadas;
- [ ] todos os segredos de homologação separados dos de produção;
- [ ] credenciais da VPS rotacionadas;
- [ ] backup externo e restore mais recente aprovados;
- [ ] migration e rollback/restore procedure aprovados;
- [ ] imagens do release identificadas por digest;
- [ ] smoke, E2E e a11y verdes no candidato;
- [ ] integrações reais de produção validadas em modo seguro;
- [ ] suporte, contatos e janela comunicados;
- [ ] critério de abortar a publicação definido.

### Execução

1. congelar alterações;
2. registrar commit, imagens, configuração e estado do banco;
3. executar backup de banco e uploads;
4. confirmar integridade do backup;
5. aplicar mudança de infraestrutura/perímetro;
6. subir imagens aprovadas;
7. aplicar migrations conforme procedimento;
8. validar `health`, `ready` e dependências;
9. executar smoke de login, sessão, lead, agenda, financeiro, conteúdo e exportação;
10. validar landing, CRM, HTTPS, cookies, WebSocket e integração mínima;
11. observar erros e recursos durante a janela acordada;
12. registrar resultado e comunicar a disponibilidade.

### Rollback

Abortar ou reverter quando houver:

- falha de migration ou inconsistência de schema;
- login, sessão ou autorização quebrados;
- exposição indevida de dados;
- erro sistemático em lead, agenda, financeiro ou conteúdo;
- TLS/cookies/CORS incorretos;
- perda de backup ou ausência de restore confiável;
- aumento anormal de 5xx, latência ou restart loop.

O rollback não deve ser improvisado no banco original. Usar o procedimento validado: rollback reversível quando comprovado ou restauração/forward-fix documentado.

## 15. Fase 10 — pós-go-live

### Primeiras 24 horas

- observar erros, latência, login, e-mail, agenda, publicação e exports;
- conferir alertas e espaço em disco;
- confirmar backup noturno e integridade;
- registrar qualquer suporte ou comportamento inesperado;
- não fazer upgrade de dependências durante a janela de estabilização.

### Primeira semana

- revisar logs de segurança e auditoria;
- testar restauração de um artefato não destrutivo;
- revisar permissões e usuários ativos;
- conferir custo/recursos da VPS;
- consolidar defeitos de baixa severidade;
- aprovar o primeiro patch.

### Rotina mensal

- patch de sistema e dependências com janela;
- `pnpm audit --prod` e revisão de advisories;
- revisão de usuários, tokens e integrações;
- restore drill;
- revisão de retenção, consentimento e exportação;
- teste de renovação TLS;
- revisão de incidentes e capacidade.

## 16. Registro consolidado de pendências

| ID | Severidade | Pendência | Evidência atual | Solução forte | Fase | Estado |
|---|---|---|---|---|---|---|
| PROD-01 | P0 | TLS ausente | Probe HTTPS sem handshake válido | Domínio, certificado, redirect e teste externo | 3 | Aberta |
| PROD-02 | P0 | Perímetro expõe API/CRM | `0.0.0.0:3001` e `0.0.0.0:4000` | Proxy único no Nginx + firewall/bind interno | 3 | Aberta |
| PROD-03 | P0 | Cookies seguros/HSTS desligados | `COOKIE_SECURE=false`, `ENABLE_HSTS=false` | Ativar após HTTPS e validar sessão | 3 | Aberta |
| PROD-04 | P0 | Sem RLS/policies | Todas as tabelas com RLS false; policy count 0 | Escolher single-tenant formal ou implementar tenant + RLS + testes | 2 | Aberta |
| PROD-05 | P1 | Admin DB com privilégio elevado | Role administrativo observado | Restringir uso administrativo, runtime mínimo e rotação | 2/3 | Aberta |
| PROD-06 | P1 | Migrations sem rollback | Quatro diretórios sem `rollback.sql` | Criar/revisar reversão ou procedimento de restore aprovado | 2 | Aberta |
| PROD-07 | P1 | Cobertura não executa | `@vitest/coverage-v8` ausente | Fixar dependência, thresholds e artefatos | 5 | Aberta |
| PROD-08 | P1 | E2E/a11y do CRM incompletos | Verificação manual parcial | Playwright + axe + matriz de rotas/viewports | 5/6 | Aberta |
| PROD-09 | P0 | Integrações reais não comprovadas | Sem SMTP/Google/WhatsApp transacionados | Contas de homologação, cenários felizes/negativos e evidências | 4 | Aberta |
| PROD-10 | P0 | Backup externo/restore não comprovados | Backup local íntegro; restore isolado ausente | Cópia externa criptografada + drill documentado | 2/7 | Aberta |
| PROD-11 | P2 | Dependências desatualizadas | Playwright/axe atualizados; avisos diretos para `multer`/ESLint e 11 subdependências deprecated | RFC de upgrade por grupo, lockfile e regressão | 5/10 | Aberta |
| PROD-12 | P1 | Security scan especializado incompleto | Preflight sem workers; Deep Scan bloqueado | Reexecutar em ambiente compatível ou auditoria equivalente | 3 | Aberta |
| PROD-13 | P2 | Documentação de versão divergente | Referências históricas a Next 14; runtime Next 15 | Atualizar docs, inventário e release notes | 0 | Aberta |
| PROD-14 | P1 | Configuração de apresentação ainda ativa | Bind público e HTTP por IP | Criar perfis explícitos demo/homologação/produção | 0/3 | Aberta |
| PROD-15 | P1 | Observabilidade limitada | Saúde verificada manualmente; sem evidência de alertas externos | Monitoramento, logs, métricas, alertas e runbook | 7 | Aberta |
| PROD-16 | P1 | Download físico de exports não fechado | Fluxo não comprovado na coleta atual | Testar geração, autorização, conteúdo, headers e expiração | 5/6 | Aberta |
| PROD-17 | P1 | Governança LGPD incompleta | Retenção/base legal/solicitações ainda precisam de aceite | Matriz de dados, finalidade, retenção e procedimento | 2/8 | Aberta |
| PROD-18 | P1 | Uploads precisam de prova completa | Sanitização presente; magic bytes/isolamento/download a validar | Hardening de storage e testes de arquivo malicioso | 3/5 | Aberta |
| PROD-19 | P2 | Teste de carga ausente | Nenhuma carga representativa executada | Definir volume, SLO e executar teste controlado | 5/7 | Aberta |
| PROD-20 | P1 | Rotação e gestão de segredos pendentes | Segredos de apresentação ainda em uso | Rotacionar VPS, JWT, DB, Redis, SMTP, OAuth e WhatsApp | 0/3/4 | Aberta |

## 17. Matriz de evidências exigidas

| Evidência | Onde registrar | Dono recomendado |
|---|---|---|
| commit/tag e digest das imagens | manifesto de release | desenvolvimento/infra |
| smoke técnico | relatório de homologação | desenvolvimento |
| testes unitários, integração e E2E | CI + artefato do release | QA/desenvolvimento |
| matriz de permissões | casos de teste e aceite | produto/segurança |
| RLS/isolation test | migrations + relatório | banco/segurança |
| backup e restore | runbook + checksum + logs | infraestrutura |
| TLS/firewall/headers | checklist de perímetro | infraestrutura/segurança |
| SMTP/Google/WhatsApp | ficha por integração | produto/infra |
| UI/a11y | screenshots + axe + roteiro | QA/produto |
| aceite da cliente | termo ou comentário assinado | produto/cliente |
| incidentes/rollback | diário de release | infraestrutura |

## 18. Definição de pronto — homologação

- [ ] ambiente isolado e identificável;
- [ ] dados sintéticos, sem credenciais de produção;
- [ ] build, lint e testes unitários verdes;
- [ ] cobertura executável e thresholds publicados;
- [ ] integração API/DB/Redis validada;
- [ ] Playwright cobrindo fluxos críticos;
- [ ] casos negativos, autorização e rate limit testados;
- [ ] UI do CRM revisada em todos os viewports;
- [ ] axe/teclado/contraste sem bloqueios;
- [ ] SMTP, Google e WhatsApp testados com contas de homologação;
- [ ] exports gerados e baixados fisicamente;
- [ ] backup/restore do ambiente ensaiados;
- [ ] nenhum P0/P1 aberto;
- [ ] aceite funcional formalizado.

## 19. Definição de pronto — produção

- [ ] domínio, DNS e TLS válidos;
- [ ] HTTP redireciona para HTTPS;
- [ ] HSTS e cookies seguros ativos e verificados;
- [ ] somente Nginx está público;
- [ ] PostgreSQL e Redis não estão publicados;
- [ ] firewall e acesso administrativo endurecidos;
- [ ] segredos de produção separados e rotacionados;
- [ ] decisão single-tenant/multi-tenant aprovada;
- [ ] RLS/isolation ou modelo single-tenant formalmente verificado;
- [ ] migrations e restore aprovados;
- [ ] backup externo criptografado e restore recente;
- [ ] monitoramento, alertas e runbook ativos;
- [ ] release candidate aprovado pela homologação;
- [ ] integrações de produção validadas;
- [ ] smoke pós-deploy executado;
- [ ] janela de observação concluída;
- [ ] rollback disponível e testado;
- [ ] cliente comunicada e aceite registrado.

## 20. Sequência recomendada de execução

1. **Governança:** fechar release candidate, responsáveis, dados sintéticos, rotação e manifesto.
2. **Homologação:** separar ambiente, instalar cobertura, completar Playwright/axe e rodar matriz funcional.
3. **Dados:** decidir isolamento, aplicar RLS ou single-tenant formal, fechar migrations e restore.
4. **Perímetro:** domínio, TLS, firewall, proxy interno, cookies, HSTS, CORS e WebSocket seguro.
5. **Integrações:** testar SMTP, Google, WhatsApp, publicação e analytics com evidência.
6. **Operação:** monitoramento, logs, alertas, backup externo e runbook.
7. **Aceite:** executar roteiro da cliente, corrigir P0/P1 e congelar o release.
8. **Go-live:** backup, deploy, migrations, smoke, observação e comunicação.
9. **Estabilização:** acompanhar 24 horas, revisar logs e executar primeiro restore/patch controlado.

## 21. Próximas cinco ações objetivas

1. Decidir e registrar o modelo de isolamento: single-tenant permanente ou tenant + RLS.
2. Configurar domínio/TLS e fechar o perímetro para deixar somente Nginx público.
3. Separar homologação de produção, rotacionar segredos e criar dados sintéticos.
4. Completar cobertura, Playwright/axe, testes de permissão e download físico.
5. Validar integrações reais e executar backup externo + restore antes do aceite.

## 22. Conclusão

O VivianiCRM já possui uma base executável e uma apresentação visual controlada, mas “100%” depende de fechar os controles que não são visíveis na tela: isolamento de dados, perímetro TLS, credenciais, restore, integrações reais, testes automatizados, observabilidade e aceite formal.

Até que as fases 0 a 9 tenham suas evidências anexadas e os itens P0/P1 estejam encerrados ou formalmente aceitos, o ambiente deve ser tratado como **homologação controlada/apresentação**, não como produção liberada.

## 23. Atualização final da rodada — 03/09/2026

Esta seção é o registro final da implementação e da verificação executadas nesta rodada. Ela substitui, para fins de decisão, os itens históricos que diziam que RLS, cobertura, rollbacks e Playwright ainda não existiam.

> As subseções 23.1–23.15 são cronológicas. A subseção **23.15** e a tabela de pendências 23.3 representam o estado técnico mais recente; registros anteriores são mantidos apenas para auditoria da evolução e não devem ser usados como status atual.

### 23.1 Resultado executivo por fase

| Fase | Resultado comprovado | Estado de saída |
|---|---|---|
| 0 — inventário e contrato | Repositório, Docker Compose, Prisma, API, CRM, landing, Nginx, PostgreSQL, Redis, uploads, autenticação, integrações e documentação revisados; ambiente self-hosted em `/opt/viviani-crm` preservado sem `down -v` | CONCLUÍDA |
| 1 — qualidade local | API 61/61 testes; cobertura executável 61/61; lint 7/7; build do monorepo concluído; build da landing concluído; `pnpm audit --prod` sem vulnerabilidades reportadas | CONCLUÍDA COM DÍVIDA DE COBERTURA |
| 2 — segurança de aplicação e dados | Rate limit Redis, brute force, sanitização, request ID, logs sem query string, upload sem overwrite, role runtime sem privilégio administrativo, RLS habilitada em 16 tabelas e 16 policies single-tenant | PARCIAL: não equivale a isolamento multi-tenant |
| 3 — infraestrutura e release | Seis serviços Docker saudáveis; `nginx -t` aprovado; `/health` e `/health/ready` 200; backup de `20260903T201117Z` com dois arquivos íntegros por SHA-256 | APROVADA PARA HOMOLOGAÇÃO |
| 4 — UI/UX e acessibilidade | Brave com landing e portal CRM em desktop/mobile; suíte pública passou 10/10 com 2 skips condicionais e suíte autenticada controlada passou 3/3 em cada viewport; sem overflow, erros de página ou violações axe no estado visual estabilizado | APROVADA PARA APRESENTAÇÃO |
| 5 — integrações, dados e governança | SMTP, Google, WhatsApp, backup externo, restore isolado, download físico, carga, observabilidade externa e aceite formal não foram comprovados | BLOQUEADA PARA PRODUÇÃO |
| 6 — decisão de release | A VPS pode ser usada para demonstração controlada com dados de apresentação; não deve ser chamada de produção real | HOMOLOGAÇÃO CONTROLADA |

### 23.2 Evidências técnicas fechadas

#### Fase 0 — inventário e fronteira operacional

- O caminho oficial é Docker Compose na VPS; não foi iniciado servidor localhost nesta rodada.
- A aplicação foi implantada em `/opt/viviani-crm`, com PostgreSQL 16, Redis 7, API, CRM, landing e Nginx.
- Os volumes existentes foram preservados. Não foi feita migração de dados; o banco permanece uma instalação nova de apresentação.
- O contrato de estágio foi criado: `stage=homologacao`/`production` aparece no health, e `deploy/vps/preflight.sh` impede promoção insegura. O valor `environment=production` continua descrevendo `NODE_ENV`, não o estágio de liberação.

#### Fase 1 — qualidade, testes e supply chain

| Verificação | Resultado | Observação |
|---|---:|---|
| `pnpm --filter @viviani/api test` | 61/61 | Passou em 19 arquivos de teste |
| `pnpm --filter @viviani/api test:coverage` | 61/61 | Instrumentação V8 instalada; cobertura de linhas medida em 32,85%, portanto não é 100% |
| `pnpm --filter @viviani/api lint` | PASSOU | Sem erro de lint |
| `pnpm lint` | 7/7 | Passou nos pacotes/apps configurados |
| `pnpm build` | PASSOU | API, CRM e landing compilados; configuração sem etapa de build é esperada |
| `pnpm audit --prod` | 0 vulnerabilidades reportadas | Avisos de deprecated em runtime/dev continuam como dívida de manutenção; a base Browserslist foi fixada e validada |
| `pnpm exec playwright test --workers=1` | 10 pass, 2 skipped | Suíte pública; os skips condicionais dependem de credenciais externas |

O runner público não recebe credenciais embutidas. Em execução controlada separada, uma conta QA efêmera foi injetada somente no processo, o portal autenticado passou em desktop e mobile com 3/3 testes por viewport, e a conta foi removida ao final.

#### Fase 2 — segurança de aplicação e banco

- Rate limit compartilhado usa Redis para o caminho global/auth e para os limites específicos de leads públicos, e-mail e operações sensíveis. O endpoint inválido testado retornou `400`, incluiu `RateLimit-*` e substituiu um `X-Request-Id` fora do formato permitido por um UUID gerado pelo servidor.
- Sanitização de HTML e links perigosos está centralizada e coberta por testes; o reset administrativo não devolve senha temporária no JSON.
- Logs de requisição usam caminho sem query string e carregam request ID; erros operacionais retornam request ID para correlação.
- Uploads validam metadados decodificados por `sharp`, aceitam somente JPEG/PNG/WebP permitidos, usam nomes UUID e criação exclusiva (`wx`) para impedir overwrite acidental.
- A role de runtime `viviani_app` foi confirmada sem superuser e sem `bypassrls`; migrações continuam usando conexão administrativa separada.
- A migration `20260903180000_single_tenant_rls` foi aplicada. No banco remoto, 16 tabelas de negócio têm RLS habilitada e 16 policies `viviani_runtime_single_tenant` existem.
- A policy aplicada é deliberadamente de single-tenant (`USING (true)`/`WITH CHECK (true)`). Isso protege o runtime contra acesso sem policy, mas **não** prova isolamento entre organizações. Se o produto se tornar multi-tenant, é necessária coluna de tenant, contexto confiável e policies por tenant com testes de não-vazamento.
- Foram adicionados `rollback.sql` transacionais para as quatro migrations históricas que não os possuíam: canais 2FA, configurações de e-mail, duração de agenda e templates/status de lead. Os rollbacks alertam sobre possível perda de dados e não foram executados no banco ativo.

#### Fase 3 — Docker, perímetro e continuidade

Estado remoto no fechamento:

| Serviço | Estado | Publicação |
|---|---|---|
| API | healthy | somente rede Docker; tráfego externo termina no Nginx `:4000` |
| CRM | healthy | somente rede Docker; tráfego externo termina no Nginx `:3001` |
| Landing | healthy | rede interna, publicada pelo Nginx |
| Nginx | healthy | `0.0.0.0:80`, `:3001` e `:4000` |
| PostgreSQL | healthy | rede Docker, sem publicação externa |
| Redis | healthy | rede Docker, sem publicação externa |

Evidências adicionais:

- `nginx -t`: sintaxe válida e teste bem-sucedido.
- `GET /health`: `200`, banco/Redis/uploads verdadeiros.
- `GET /health/ready`: `200`, banco/Redis verdadeiros.
- Landing, login do CRM e endpoints da API retornaram `200` pelo endereço público da VPS.
- Backup local `20260903T200153Z`: `db-*.sql.gz` e `uploads-*.tar.gz` passaram em `sha256sum -c`.
- O script de restore foi preparado com confirmação explícita, restauração de banco/uploads e recriação da role runtime, mas não foi executado destrutivamente no ambiente ativo. Falta ensaio em instalação isolada.

O perímetro atual é adequado para apresentação controlada, não para dados reais: não há domínio/TLS, HTTP ainda é o protocolo público, cookies Secure/HSTS permanecem desligados e o Nginx mantém `:3001`/`:4000` públicos para compatibilidade com o acesso atual por IP. API e CRM não possuem mais publicação direta de container.

O preflight de produção agora exige URLs HTTPS em hostname DNS, hosts públicos iguais aos hosts do Nginx, cookies Secure, HSTS, `TRUST_PROXY`, override HTTPS do Compose, seed desligado, segredos não-placeholder e confirmações manuais de backup externo, firewall, SSH/root e rotação de segredos; sem isso, a promoção falha antes do Compose.

#### Fase 4 — UI/UX, Brave e acessibilidade

- O runner usou o executável Brave instalado em `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`.
- Landing: desktop e viewport mobile; carregamento do hero, imagem visível, CTA navegável, menu mobile com exatamente um controle de fechamento e ausência de overflow horizontal.
- CRM: tela de login desktop/mobile; labels, IDs, placeholders completos `Usuário` e `Senha`, botão de entrada, ausência de overflow e ausência de erro de página.
- Axe: landing e login CRM passaram no desktop e mobile após aguardar o término das animações de entrada; a análise durante opacidade parcial foi removida do gate para evitar falso positivo de composição de cores.
- A correção final de UI removeu o overlay de brilho e a sombra utilitária do CTA que confundiam o analisador de contraste; a cor do texto do rodapé móvel também foi ajustada.
- O HERO preserva a composição original, imagem local com placeholder blur, carrossel/conteúdo editorial e parallax aplicado apenas ao background, sem partículas, estrelas decorativas, emojis ou ornamentos com aparência de IA.

#### Fase 5 — integrações e governança não fabricadas

Permanecem sem comprovação transacional: SMTP real, OAuth/Google Calendar/Business, webhook/envio do WhatsApp Business, downloads físicos de todos os exports, carga representativa, alertas externos, cópia de backup fora da VPS e restore isolado. A implementação existente deve exibir pendência/falha operacional; não deve ser apresentada como integração ativa.

Também permanecem obrigatórios antes de dados reais: rotação da senha root/SSH já utilizada, segredos separados por estágio, decisão formal single-tenant/multi-tenant, política LGPD de retenção/base legal, matriz completa de permissões e aceite da cliente.

### 23.3 Registro final de pendências e solução de liberação

| ID | Estado final | Solução necessária para fechar |
|---|---|---|
| PROD-01 TLS/domínio | ABERTA — P0 | Configurar DNS, certificado válido, redirect HTTP→HTTPS, renovação e teste externo |
| PROD-02 perímetro | FECHADA PARA HOMOLOGAÇÃO; PENDENTE PRODUÇÃO — P0 | API/CRM agora ficam somente na rede Docker e o Nginx é o único serviço público; produção ainda exige domínio, HTTPS em 443 e firewall restritivo |
| PROD-03 cookies/HSTS | ABERTA — P0 | Ativar `COOKIE_SECURE` e HSTS somente depois de HTTPS validado |
| PROD-04 isolamento | PARCIAL — P0/P1 | Formalizar single-tenant permanente e teste de policy, ou implementar tenant/RLS real; a policy atual não é isolamento multi-tenant |
| PROD-05 role/segredos | PARCIAL — P1 | Runtime já está mínimo; rotacionar root/SSH, JWT, banco, Redis e integrações |
| PROD-06 rollbacks | PARCIAL — P1 | Rollback dos arquivos existe e o dump foi restaurado em banco isolado; ainda falta executar/revisar rollback de migration em clone e anexar log aprovado |
| PROD-07 cobertura | PARCIAL — P1 | Manter comando executável, criar thresholds mínimos por pacote e ampliar além dos 32,85% de linhas |
| PROD-08 E2E/a11y CRM | PARCIAL — P1 | Suíte autenticada agora cobre portal desktop/mobile e quatro famílias de download; faltam mutações, perfis negativos, 2FA e execução no CI com segredo injetado |
| PROD-09 integrações | ABERTA — P0 | Contas de homologação/produção, testes felizes/negativos e evidências de eventos reais |
| PROD-10 backup/restore | PARCIAL — P0 | `backup.sh` verifica cópia em `BACKUP_EXTERNAL_DIR` e `restore.sh` valida SHA-256 antes de agir; falta armazenamento externo real, criptografia/retention operacional, periodicidade e aceite do drill |
| PROD-11 dependências | DÍVIDA — P2 | Atualizar deprecated/Turbo em janela controlada com regressão; o aviso do Browserslist já foi removido |
| PROD-12 security scan | BLOQUEADA POR FERRAMENTA — P1 | Rodar scanner especializado em ambiente compatível ou anexar auditoria equivalente revisada |
| PROD-13 documentação | PARCIAL — P2 | Corrigir referências históricas Next 14 e nomenclatura `production`/`hml` |
| PROD-14 perfis | PARCIAL — P1 | `DEPLOYMENT_STAGE`, preflight, hosts, TLS e override HTTPS agora têm guardas; falta preencher o perfil real e executar o go-live |
| PROD-15 observabilidade | PARCIAL — P1 | Monitorar health, logs, recursos e alertas externos com responsável e SLO |
| PROD-16 downloads | PARCIAL — P1 | Leads, financeiro, disparos e segurança tiveram download físico em Brave; faltam exports futuros, autorização negativa, conteúdo completo e política de expiração |
| PROD-17 LGPD | ABERTA — P1 | Aprovar matriz de finalidade, base legal, retenção, atendimento e descarte |
| PROD-18 uploads | PARCIAL — P1 | Completar testes de magic bytes, arquivo malicioso, isolamento, download e retenção |
| PROD-19 carga | ABERTA — P2 | Definir volume/SLO e executar teste controlado sem dados reais |
| PROD-20 rotação | ABERTA — P0 | Revogar a credencial usada na sessão e emitir chaves/segredos novos por ambiente |

### 23.4 Decisão de liberação

**Homologação controlada/apresentação: APROVADA COM RESTRIÇÕES.** O ambiente está disponível na VPS, os seis serviços estão saudáveis, o caminho público e o login do CRM respondem, e o gate Brave desktop/mobile passou nos testes automatizados executados. Usar somente dados sintéticos/de demonstração e manter a operação supervisionada.

**Produção real: BLOQUEADA.** Não é tecnicamente honesto marcar produção como 100% enquanto houver HTTP por IP, portas diretas, segredos não rotacionados, ausência de backup externo/restore isolado, integrações não transacionadas, downloads/permissões não fechados e aceite formal pendente. A solução forte é cumprir a sequência: perímetro/TLS → rotação e perfis → isolamento/backup/restore → integrações → E2E completo e downloads → observabilidade → aceite → go-live com backup, smoke, janela de observação e rollback.

### 23.5 Verificação pós-fechamento do perímetro — 03/09/2026, 20:11 UTC

- `docker compose ps`: API, CRM, landing, Nginx, PostgreSQL e Redis `healthy`.
- `nginx -t`: configuração válida.
- `api` e `crm`: `HostConfig.PortBindings={}`; não têm publicação própria no host.
- `nginx`: único serviço publicado, nas portas `80`, `3001` e `4000`.
- `GET /health`, `GET /health/ready`, `GET /login` e landing pública: respostas `200` confirmadas após a troca.
- `POST /api/v1/leads` inválido via Nginx: `400`, `RateLimit-*` e `X-Request-Id` presentes.
- Brave desktop/mobile após o proxy: 10 testes passaram, 2 foram omitidos por credenciais externas não injetadas.
- Backup `20260903T201117Z`: dump do banco e arquivo de uploads passaram em `sha256sum -c`.

O fechamento reduz a exposição direta dos containers, mas não fecha produção: o Nginx ainda expõe HTTP por IP para manter a apresentação, não existe certificado/dominio válido, e o firewall/perfil 443 ainda precisa ser aplicado.

### 23.6 Correção do login autenticado atrás do Nginx — 03/09/2026, 20:31 UTC

- Achado reproduzido no fluxo real: a API pública respondia `200 application/json` para a credencial válida, mas o callback `POST /api/auth/callback/credentials` retornava `502 text/html`. O log do Nginx identificou `upstream sent too big header while reading response header from upstream`.
- Causa: o cookie JWT da sessão do NextAuth contém o contexto de acesso do CRM e ultrapassava o buffer padrão do proxy. O defeito aparecia somente no login válido; credenciais inválidas continuavam retornando JSON e escondiam o problema.
- Correção aplicada em `deploy/docker/nginx.conf`: `large_client_header_buffers 4 16k`, `proxy_buffer_size 16k`, `proxy_buffers 8 16k` e `proxy_busy_buffers_size 32k`. O Nginx foi recriado para carregar o bind mount atualizado; nenhum volume foi removido ou recriado.
- Validação posterior: `nginx -t` passou; callback NextAuth retornou `200`; `/api/auth/session` retornou `200`; o CRM carregou `/dashboard`; o teste Playwright autenticado com credencial injetada somente em runtime passou (`1 passed`). O limite do matcher foi ajustado para 15 s para refletir a latência observada na VPS, sem alterar o comportamento de autenticação.
- O estado de limitação temporário usado exclusivamente pelos testes foi limpo antes da repetição; não foram alterados dados de negócio, senha ou volumes.
- **Estado:** defeito do caminho de login autenticado corrigido e comprovado em homologação. Isso fecha o fluxo de entrada, mas não fecha a cobertura de todos os módulos, downloads, integrações reais ou os gates de produção listados na seção 23.3.

### 23.7 Navegação autenticada do portal principal — 03/09/2026, 20:35 UTC

- Com a conta de homologação injetada apenas no processo de teste, foram abertas em desktop e viewport móvel as rotas `/dashboard`, `/leads`, `/leads/disparos`, `/agenda`, `/financeiro`, `/editar-site`, `/seguranca`, `/colaboradores`, `/administracao` e `/configuracoes`.
- Todas responderam `200`, permaneceram na rota esperada, não produziram erros de página nem respostas `4xx/5xx`, e não apresentaram overflow horizontal. A validação foi somente leitura; nenhum registro foi criado, alterado ou excluído.
- **Estado:** navegação estrutural do CRM comprovada em homologação desktop/móvel. Operações de mutação, exports/downloads, permissões negativas por perfil e integrações externas continuam pendentes de testes transacionais controlados.

### 23.8 Fechamento técnico da rodada — 03/09/2026

- `pnpm test`: 48 testes de API aprovados em 16 arquivos.
- `pnpm lint`: 7 pacotes aprovados.
- `pnpm build`: API, CRM, landing e pacotes compartilhados compilados com sucesso.
- `pnpm audit --prod --json`: 0 vulnerabilidades informadas; o Playwright foi atualizado para `1.62.1` e `@axe-core/playwright` para `4.13.0`.
- `pnpm exec playwright test --workers=1` contra a VPS usando Brave: 10 passaram e 2 foram omitidos porque o teste autenticado opcional não recebe credenciais por padrão. O fluxo autenticado foi executado separadamente e passou antes desta atualização; a suíte pública foi repetida após a atualização.
- Manutenção concluída: `caniuse-lite` foi atualizado para `1.0.30001810`; o build final não emitiu mais o aviso do Browserslist.
- **Estado:** código e homologação controlada aprovados nos gates executados; produção continua bloqueada pelos gates externos e de governança da seção 23.3.

### 23.9 Perfil de produção e barreira contra promoção insegura — 03/09/2026

- O perfil `deploy/docker/docker-compose.production.yml` substitui as portas de apresentação por `80` e `443`; API e CRM continuam sem publicação própria.
- `deploy/docker/nginx.production.conf` termina TLS, redireciona HTTP para HTTPS, aplica HSTS e encaminha os três hosts por nome. A diretiva HTTP/2 foi escrita na sintaxe atual do Nginx, sem o aviso deprecado observado no primeiro ensaio.
- `deploy/vps/preflight.sh` agora bloqueia também: Compose base sem o override de produção, hosts públicos divergentes do Nginx, URLs com porta/caminho, firewall não confirmado, acesso SSH/root não rotacionado e segredos de produção não rotacionados.
- O `.env.example` documenta os gates, e chaves TLS `.pem`/`.key` ficam ignoradas pelo Git. Os certificados reais ainda precisam ser instalados somente na VPS.
- Ensaio isolado remoto com ambiente temporário e certificado de teste: preflight de produção passou, `docker compose config` confirmou somente `80/443`, e o Nginx aceitou a configuração sem warning de HTTP/2. Nenhuma alteração de estágio ou certificado de teste foi aplicada à instância ativa.
- Revalidação posterior: o preflight da instância ativa passou como `homologacao`, os seis serviços continuaram `healthy`, `nginx -t` passou e health/readiness retornaram `200`. Um segundo ensaio sem `COMPOSE_FILE` de produção foi recusado pelo guard (`PRODUCTION_BASE_COMPOSE_GUARD_OK`).
- A instância ativa continua explicitamente em `DEPLOYMENT_STAGE=homologacao`, com `BACKUP_EXTERNAL_CONFIRMED=false`; portanto, a barreira foi validada sem promover a apresentação por acidente.
- **Estado:** guardas de configuração fechados no código; produção ainda bloqueada por domínio/certificado real, firewall efetivo, rotação comprovada, backup externo/restore, integrações e aceite.

### 23.10 Correção de configuração Nginx defasada na VPS — 03/09/2026

- Na verificação final, o Nginx ativo ainda carregava uma cópia antiga com um bloco de redirect HTTPS para um host de produção. Como esse bloco era o primeiro servidor padrão, o acesso por IP devolvia `308` em `/health`, embora o arquivo atual do repositório já estivesse correto para homologação.
- A causa foi divergência entre o bind mount existente na VPS e o arquivo homologação do repositório; atualizar o arquivo montado não recarrega automaticamente o processo Nginx.
- A correção foi sincronizar `deploy/docker/nginx.conf` e recriar somente `viviani-nginx-1` com `docker compose up -d --force-recreate nginx`. Nenhum volume foi removido e API, CRM, landing, PostgreSQL e Redis não foram recriados.
- Validação posterior: `nginx -t` passou; IP `/health` retornou `200`, CRM `/login` retornou `200`, API `/health/ready` retornou `200` e os seis serviços ficaram `healthy`.
- **Estado:** defeito de configuração da homologação fechado; a regra de recriação/reload do Nginx permanece parte obrigatória do runbook de atualização.

### 23.11 Backup externo e restore isolado — 03/09/2026

- O primeiro restore drill revelou que o dump referencia a role `viviani_app`; `restore.sh` foi corrigido para recriar/garantir a role antes da importação e novamente depois, evitando falha em banco vazio.
- `restore.sh` agora exige o manifesto `sha256-<timestamp>.txt` correspondente e valida os arquivos antes de parar serviços ou executar a operação destrutiva.
- No drill remoto isolado, o último dump foi importado em um PostgreSQL temporário sem tocar no volume ativo: 17 tabelas foram restauradas e o arquivo de uploads foi extraído para diretório temporário; a homologação atual não contém arquivos de upload (`0` arquivos), portanto isso não prova restauração de mídia real.
- `backup.sh` passou a aplicar `umask 077`, gerar checksums relativos e, quando `BACKUP_EXTERNAL_DIR` aponta para um volume já montado fora do diretório local, copiar banco/uploads/manifesto e validar a cópia. O ensaio funcional produziu 3 artefatos no destino local e 3 no destino externo temporário, todos verificados.
- Os units `viviani-crm-backup.service` e `viviani-crm-backup.timer` foram validados com `systemd-analyze verify`; o service chama o script via `/bin/sh`, portanto não depende do bit executável preservado por SCP. Eles ainda não foram instalados/ativados na instância ativa.
- A cópia externa real, a criptografia do destino, a retenção aplicada no storage externo e a execução periódica ainda não existem na VPS ativa; `BACKUP_EXTERNAL_CONFIRMED=false` permanece correto.
- **Estado:** restore técnico fechado parcialmente e automatização preparada; continuidade de produção ainda bloqueada até armazenamento externo real, política de retenção/criptografia e drill aprovado formalmente.

### 23.12 Smoke operacional pós-deploy — 03/09/2026

- `deploy/vps/operational-smoke.sh` foi criado para evitar regressão silenciosa de infraestrutura: verifica os seis healthchecks, `nginx -t`, endpoints públicos de landing/CRM/API e ausência de bindings de host em API/CRM.
- O smoke foi executado na instância ativa e passou em `homologacao` após a correção do Nginx.
- O script é um controle local de detecção; alertas externos, SLO, retenção de logs e responsável de plantão ainda precisam ser configurados antes da produção.

### 23.13 Atualização controlada das ferramentas de validação — 03/09/2026

- Atualizados e fixados no `package.json`/lockfile: `@playwright/test` `1.55.1` → `1.62.1`, `@axe-core/playwright` `4.10.2` → `4.13.0`, `caniuse-lite` `1.0.30001810` e `baseline-browser-mapping` `2.11.21`.
- Após a atualização, `pnpm test` passou com 48/48 testes, `pnpm lint` passou em 7/7 pacotes e `pnpm exec playwright test --workers=1` com Brave passou com 10 testes e 2 skips condicionais por credenciais ausentes.
- `pnpm exec turbo run build --force` passou para API, CRM, landing e pacotes compartilhados, sem o aviso do Browserslist; a mesma instalação reproduzível foi usada no rebuild remoto.
- `pnpm audit --prod --json` permaneceu em zero vulnerabilidades. A instalação ainda reporta obsolescência direta em `multer@1.4.5-lts.2` e `eslint@8.57.1`, além de 11 subdependências deprecated; não foram trocadas nesta janela porque não foram necessárias para a correção dos testes e podem alterar o runtime.
- `pnpm outdated --format json` continua indicando atualizações de Turbo, TypeScript, Prettier e ferramentas de lint. Isso é dívida P2 de manutenção, não evidência de vulnerabilidade de produção.
- **Estado:** atualização das ferramentas de evidência aprovada; PROD-11 permanece aberta até a janela específica de upgrades, regressão de runtime e revisão dos avisos deprecated.

### 23.14 Revalidação final da homologação — 03/09/2026

- O lockfile final foi sincronizado na VPS e as imagens de API, CRM e landing foram reconstruídas com `pnpm install --frozen-lockfile`; a compilação remota não emitiu o aviso do Browserslist.
- A primeira chamada imediata ao smoke encontrou `nginx health is starting` durante a janela normal de inicialização. A inspeção posterior confirmou o Nginx `healthy`; a repetição do smoke passou.
- Estado final remoto: seis serviços `healthy`, preflight `homologacao` aprovado, smoke operacional aprovado, API/CRM sem bindings de host próprios e Nginx como único perímetro público da apresentação.
- A suíte Brave foi repetida após o rebuild: 10 testes passaram e 2 foram omitidos de forma controlada por ausência de credenciais no runner. O build e o teste unitário locais também permaneceram aprovados; `pnpm audit --prod --json` retornou 0 vulnerabilidades.
- **Veredito:** homologação controlada permanece apta para apresentação com dados sintéticos; produção real permanece bloqueada pelos gates externos e de governança da seção 23.3.

### 23.15 Hardening final de conteúdo, CSP e E2E autenticado — 03/09/2026

- A CSP da landing deixou de permitir `unsafe-eval`; a resposta pública foi conferida na VPS e mantém `script-src` sem essa diretiva.
- `GET /api/v1/content/auto-templates` deixou de transformar falha de banco em `200` com lista vazia: agora registra erro estruturado e passa a falha ao handler HTTP. O mesmo padrão foi aplicado ao log de falha da listagem de agenda.
- A biografia pública deixou de usar `dangerouslySetInnerHTML`; a landing renderiza somente a allowlist editorial (`p`, `strong`, `em`, `u`, listas, headings, blockquote, `br` e links com `http`, `https` ou `mailto`). A API também sanitiza o valor no retorno público.
- O gerenciamento de usuários ganhou testes de rota para criação e reset sem vazamento de senha temporária, além da proteção contra autoexclusão administrativa. Autenticação, 2FA por e-mail, troca de senha, sanitização pública e templates automáticos também têm cobertura de rota.
- A suíte `e2e/crm.spec.ts` foi consolidada para fazer um login por viewport, evitando que o próprio teste contamine o limite anti-brute-force Redis. Ela percorre dez módulos e valida downloads físicos de leads, financeiro, disparos e segurança.
- Execução controlada na VPS com conta administrativa QA efêmera: desktop `3/3` e mobile `3/3`; a conta e seus registros de auditoria foram removidos ao final. Não houve mutação de dados de negócio.
- A repetição final do perímetro passou: seis serviços `healthy`, preflight e smoke `homologacao` aprovados, sem arquivos QA residuais e sem listeners localhost nas portas `3000`, `3001` e `4000`.
- Evidência local atualizada: API `61/61`, cobertura V8 `32,85%` de linhas, lint `7/7` e build completo aprovado. O percentual de cobertura continua sendo um indicador de teste, não uma alegação de 100% de cobertura.
- **Estado:** hardening interno e cobertura autenticada executável fechados para homologação; produção continua bloqueada pelos gates reais de domínio/TLS, rotação, backup externo, integrações, observabilidade, carga, governança LGPD e aceite.
