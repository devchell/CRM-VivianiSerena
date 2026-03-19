# 15 Module Functionality Audit

## Objetivo
Documentar as funcionalidades reais do sistema por modulo, separando o que esta:
- operacional;
- parcial;
- apenas visual;
- legado;
- dependente de configuracao externa.

Este documento foi produzido a partir da leitura das telas do CRM, landing page, rotas da API e servicos centrais de metricas em `2026-03-18`.

## Legenda de status
- `operacional`: fluxo implementado e conectado a backend/persistencia real.
- `parcial`: existe implementacao funcional, mas com limitacoes, inconsistencias ou dependencia externa nao garantida.
- `visual`: a superficie existe, mas sem fonte real ou com comportamento placeholder/mock.
- `legado`: tela ou fluxo duplicado/antigo, sem ser a trilha principal recomendada.
- `condicional`: funciona apenas se integracoes/envs externas estiverem configuradas.

## Resumo por modulo

| Modulo | Status geral | Observacao principal |
| --- | --- | --- |
| Landing publica | parcial | captura lead e analytics reais; conteudo ainda nao esta 100% modelado no CMS |
| Auth e acesso | operacional | login, refresh, perfil e troca de senha reais; 2FA depende de e-mail/SMS |
| Dashboard | operacional | usa fonte canonica em `/api/v1/metrics/overview` |
| Leads | operacional | CRUD, export e anonimizar LGPD reais |
| Agenda | operacional | CRUD real com duracao operacional padronizada em 60 minutos |
| Financeiro | operacional | listagem, resumo, graficos, CRUD e export reais |
| Seguranca | operacional | eventos, stats, cache e alertas realtime agora usam a mesma trilha operacional |
| Colaboradores | operacional | CRUD real com roles alinhadas a `ADMIN`, `MANAGER` e `VIEWER` |
| Configuracoes | operacional | perfil, senha, 2FA e tema reais |
| CMS / editar site | operacional | edicao, publish e historico/versionamento agora usam persistencia real |
| Notificacoes | operacional | header consome feed real e persiste leitura por usuario |
| Privacidade / LGPD | operacional | export e anonimizar reais |
| Analytics | operacional | sessoes, eventos e web vitals persistem sem criar leads sinteticos |
| PWA / offline | visual | manifest e tela offline existem, sem offline real |
| Editor de site legado | legado | existe tela antiga paralela ao editor principal |

## 1. Landing publica

### 1.1 Renderizacao do site
- Superficie: `apps/landing/src/app/page.tsx`
- Backend: `GET /api/v1/content`
- Status: `parcial`
- O que funciona:
  - a landing carrega conteudo remoto da API;
  - hero, bio e configuracoes de contato podem ser alimentados pelo CMS.
- Limitacoes:
  - varias secoes continuam essencialmente estaticas no front;
  - o CMS principal nao cobre todo o site de forma uniforme.

### 1.2 Formulario multi-step de captacao
- Superficie: `apps/landing/src/components/LeadFormSection.tsx`
- Backend: `POST /api/v1/leads`
- Status: `operacional`
- O que funciona:
  - coleta nome, email, telefone, servico e periodo;
  - envia lead real para a API com UTM e notas consolidadas;
  - usa honeypot `website` para bots;
  - fallback abre WhatsApp se o envio falhar.
- Observacoes:
  - o texto do card mostra `0 clientes` por desenho atual de homologacao.

### 1.3 Analytics de navegacao
- Superficie: `trackLead`, `trackConversion`, pageview/vitals/event
- Backend: `POST /api/v1/analytics/pageview`, `/event`, `/vitals`
- Status: `operacional`
- O que funciona:
  - `pageview` cria/atualiza sessao analitica real;
  - `event` persiste eventos em `analytics_events`;
  - `vitals` persiste web vitals em `web_vitals`;
  - a landing agora mantem `sessionId` proprio e envia tracking para a API real.
- Limitacoes:
  - GA4 continua condicional ao `NEXT_PUBLIC_GA_ID`;
  - dashboards analiticos continuam simples e sem tela dedicada de exploracao.

### 1.4 SEO e publicacao
- Superficie: `robots.ts`, `sitemap.ts`, `POST /api/revalidate`
- Backend: `POST /api/v1/content/publish`
- Status: `operacional`
- O que funciona:
  - o CRM pode disparar revalidacao da landing via API;
  - sitemap e robots existem.

## 2. Auth e acesso

### 2.1 Login
- Superficie: `apps/crm/src/app/login/page.tsx`
- Backend: `POST /api/v1/auth/login`
- Status: `operacional`
- O que funciona:
  - login por email/senha;
  - integracao com NextAuth para criar sessao do CRM;
  - prefetch das rotas principais apos autenticacao.

### 2.2 Refresh, logout e sessao atual
- Backend: `/api/v1/auth/refresh`, `/logout`, `/me`
- Status: `operacional`
- O que funciona:
  - access token e refresh token;
  - sessao atual retorna nome, modulos, 2FA, role e flags operacionais.

### 2.3 Primeiro acesso / definir senha
- Superficie: `apps/crm/src/app/definir-senha/page.tsx`
- Backend: `POST /api/v1/auth/set-password`
- Status: `operacional`
- O que funciona:
  - colaborador criado com senha temporaria;
  - no primeiro acesso pode definir nova senha e remover `mustChangePassword`.

### 2.4 Perfil e senha
- Superficie: `apps/crm/src/app/(dashboard)/configuracoes/page.tsx`
- Backend: `PUT /api/v1/auth/profile`, `PUT /api/v1/auth/password`
- Status: `operacional`
- O que funciona:
  - atualizar nome e telefone;
  - trocar senha autenticado.

### 2.5 2FA
- Superficie: login + configuracoes
- Backend: `/api/v1/auth/2fa/*`
- Status: `condicional`
- O que funciona:
  - fluxo email OTP -> SMS OTP -> conclusao de sessao;
  - toggle de 2FA pelo proprio usuario.
- Dependencias:
  - e-mail operacional;
  - SMS operacional;
  - telefone cadastrado.

## 3. Dashboard e metricas

### 3.1 Visao geral
- Superficie: `apps/crm/src/app/(dashboard)/dashboard/page.tsx`
- Backend: `GET /api/v1/metrics/overview?period=month`
- Status: `operacional`
- O que funciona:
  - cards de KPI;
  - grafico financeiro;
  - funil de leads;
  - atividade recente.
- Observacao:
  - a tela ja nao recalcula localmente os indicadores principais.

### 3.2 Fonte unica da verdade
- Backend: `apps/api/src/domain/metrics/service.ts`
- Status: `operacional`
- O que funciona:
  - `getMetricsOverview`
  - `getLeadMetrics`
  - `getFinancialSummary`
  - `getFinancialCharts`
  - `getAnalyticsMetrics`
  - `getRecentActivity`
- Observacao:
  - este e o servico canonico para dashboard e agregados.

## 4. Leads

### 4.1 Listagem e consulta
- Superficie: `apps/crm/src/app/(dashboard)/leads/page.tsx`, `LeadsTable.tsx`
- Backend: `GET /api/v1/leads`, `GET /api/v1/leads/:id`
- Status: `operacional`
- O que funciona:
  - listar leads;
  - filtrar por status;
  - buscar;
  - consultar lead individual.

### 4.2 Atualizacao de status e edicao
- Backend: `PATCH /api/v1/leads/:id`, `PUT /api/v1/leads/:id`
- Status: `operacional`
- O que funciona:
  - atualizar status;
  - marcar convertido e preencher `convertedAt`.

### 4.3 Exportacao
- Backend: `GET /api/v1/leads/export`
- Status: `operacional`
- O que funciona:
  - export CSV com dados comerciais e UTM.

### 4.4 Remocao e LGPD
- Backend: `DELETE /api/v1/leads/:id`, `PATCH /api/v1/leads/:id/gdpr`
- Status: `operacional`
- O que funciona:
  - apagar lead;
  - anonimizar lead sem destruir metricas.

### 4.5 Observacoes de auditoria
- O filtro principal do CRM busca `limit=100`; a UX nao expone paginacao completa, embora a API suporte.
- O dominio comercial ja exclui tracking leads usando `@tracking.internal`.

## 5. Agenda

### 5.1 Calendario e leitura operacional
- Superficie: `apps/crm/src/app/(dashboard)/agenda/page.tsx`
- Backend: `GET /api/v1/appointments`
- Status: `operacional`
- O que funciona:
  - visualizar agenda semanal/diaria/mensal;
  - clicar em evento e ler resumo;
  - cards de proximos atendimentos e indicadores de agenda.

### 5.2 Criacao de agendamento
- Backend: `POST /api/v1/appointments`
- Status: `operacional`
- O que funciona:
  - criar agendamento ligado a um lead;
  - disparar email de confirmacao;
  - tentar criar evento no Google Calendar.

### 5.3 Edicao e exclusao
- Backend: `PATCH /api/v1/appointments/:id`, `DELETE /api/v1/appointments/:id`
- Status: `operacional`
- O que funciona:
  - editar data/notas/servico;
  - excluir agendamento e deletar evento Google, se existir.

### 5.4 Duracao operacional
- Status: `operacional`
- O que funciona:
  - a duracao do agendamento foi centralizada como janela padrao de 60 minutos;
  - o frontend nao promete mais uma duracao variavel que o banco nao persiste;
  - o contrato de dados e a UI agora seguem a mesma semantica.

### 5.5 Disponibilidade Google Calendar
- Backend: `GET /api/v1/appointments/availability`
- Status: `condicional`
- O que funciona:
  - consulta slots no Google Calendar se a integracao estiver configurada.
- Dependencias:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
  - token salvo com sucesso via callback.

## 6. Financeiro

### 6.1 Listagem e filtros
- Superficie: `apps/crm/src/app/(dashboard)/financeiro/page.tsx`
- Backend: `GET /api/v1/financials`
- Status: `operacional`
- O que funciona:
  - listar lancamentos;
  - filtrar por tipo, categoria e busca;
  - paginar localmente no front.

### 6.2 KPIs e graficos
- Backend: `GET /api/v1/financials/summary`, `GET /api/v1/financials/charts`
- Status: `operacional`
- O que funciona:
  - receita, despesas, lucro e ticket medio;
  - evolucao mensal;
  - despesas por categoria.

### 6.3 CRUD financeiro
- Backend: `POST /api/v1/financials`, `PATCH /api/v1/financials/:id`, `DELETE /api/v1/financials/:id`
- Status: `operacional`
- O que funciona:
  - criar lancamento;
  - editar;
  - excluir;
  - marcar recorrente.

### 6.4 Exportacao
- Status: `operacional`
- O que funciona:
  - CSV no cliente;
  - PDF no cliente via `jspdf`.

## 7. Seguranca

### 7.1 Painel de eventos
- Superficie: `apps/crm/src/app/(dashboard)/seguranca/page.tsx`
- Backend: `GET /api/v1/security/events`
- Status: `operacional`
- O que funciona:
  - listar eventos;
  - filtrar por severidade;
  - abrir detalhe;
  - resolver evento.

### 7.2 Stats e checklist
- Backend: `GET /api/v1/security/stats`, `/checklist`, `/activity`
- Status: `parcial`
- O que funciona:
  - contagem por severidade;
  - criticos 24h;
  - checklist de seguranca;
  - atividade por hora;
  - invalidacao de cache e emissao de `security_alert` na mesma trilha operacional dos eventos.
- Observacoes:
  - o checklist mistura verificacoes reais com flags derivadas de env;
  - itens como HTTPS e headers sao apresentados como verdade de ambiente, mas parte da avaliacao ainda depende do deploy/proxy real;
  - a rota `/activity` usa eventos reais, mas o painel a apresenta como monitoramento mais robusto do que de fato existe.

### 7.3 Blocklist e alerta de teste
- Backend: `/blocked-ips`, `/block-ip`, `/test-alert`
- Status: `operacional`
- O que funciona:
  - bloquear IP;
  - desbloquear IP;
  - criar evento de teste.

### 7.4 Realtime e notificacoes do navegador
- Status: `operacional`
- O que funciona:
  - a UI abre socket e espera `security_alert`.
- O que foi corrigido:
  - criacao, resolucao, bloqueio manual e alerta de teste agora invalidam cache e emitem `security_alert` pela mesma trilha realtime.
- Observacao:
  - ainda depende do ambiente websocket estar operacional no deploy.

## 8. Colaboradores

### 8.1 Listar, criar, editar e remover usuario
- Superficie: `apps/crm/src/app/(dashboard)/colaboradores/page.tsx`
- Backend: `/api/v1/users`
- Status: `operacional`
- O que funciona:
  - listar usuarios;
  - criar colaborador;
  - editar nome, telefone, role e modulos;
  - excluir usuario;
  - envio de convite por e-mail.

### 8.2 Controle de modulos
- Status: `operacional`
- O que funciona:
  - a UI envia `allowedModules`;
  - a API normaliza modulos por role.
- Risco:
  - enforcement real depende do backend e da navegacao protegida; precisa auditoria funcional dedicada de permissao por modulo.

## 9. Configuracoes

### 9.1 Perfil
- Status: `operacional`
- O que funciona:
  - editar nome;
  - editar telefone;
  - refletir nome atualizado na sessao.

### 9.2 Senha
- Status: `operacional`
- O que funciona:
  - troca de senha autenticada.

### 9.3 2FA
- Status: `condicional`
- O que funciona:
  - toggle pelo usuario com confirmacao por senha.

### 9.4 Tema
- Status: `operacional`
- O que funciona:
  - claro e escuro;
  - o padrao atual do CRM foi ajustado para abrir em claro.

## 10. CMS / editar site

### 10.1 Editor principal
- Superficie: `apps/crm/src/app/(dashboard)/editar-site/page.tsx`
- Backend: `/api/v1/content`, `/api/v1/content/:section/:key`, `/api/v1/content/upload`, `/api/v1/content/publish`
- Status: `operacional`
- O que funciona:
  - ler conteudo;
  - editar campos;
  - autosave;
  - upload de imagem;
  - preview em iframe;
  - publish da landing;
  - listar historico real em `content_versions`;
  - restaurar versoes anteriores.
- O que esta incompleto:
  - nem todo o site esta modelado no editor;
  - uploads ainda usam filesystem local da API.

### 10.2 Uploads
- Status: `operacional`, com restricao arquitetural
- O que funciona:
  - upload via `multer` + `sharp`;
  - gera full, thumb e blur.
- Limitacao:
  - storage em filesystem local da API.

## 11. Editor de site legado

### 11.1 Tela `site`
- Superficie: `apps/crm/src/app/(dashboard)/site/page.tsx`
- Status: `legado`
- O que faz:
  - agora redireciona para `editar-site`.
- Observacao:
  - a trilha duplicada deixou de competir com o editor principal.

## 12. Privacidade / LGPD

### 12.1 Exportar dados pessoais
- Backend: `GET /api/v1/privacy/export?email=...`
- Status: `operacional`
- O que funciona:
  - exporta lead, sessoes e agendamentos;
  - mascara IP no output;
  - registra audit log.

### 12.2 Anonimizacao de lead
- Backend: `PATCH /api/v1/leads/:id/gdpr`
- Status: `operacional`
- O que funciona:
  - anonimiza lead sem apagar series historicas do sistema.

## 13. Notificacoes

### 13.1 Bell do header
- Superficie: `apps/crm/src/components/layout/NotificationBell.tsx`
- Backend local: `GET /api/notifications`
- Status: `operacional`
- O que existe:
  - dropdown de notificacoes no header.
- O que de fato ocorre:
  - a API expõe `/api/v1/notifications`;
  - a leitura e persistida por usuario em `notification_reads`;
  - a rota local do CRM faz proxy autenticado para esse endpoint.
- O que falta:
  - categorias mais ricas e acao contextual por notificacao.

## 14. PWA e offline

### 14.1 Manifest e shortcuts
- Superficie: `apps/crm/src/app/manifest.ts`
- Status: `parcial`
- O que funciona:
  - manifest web app;
  - atalhos para modulos.

### 14.2 Tela offline
- Superficie: `apps/crm/src/app/offline/page.tsx`
- Status: `visual`
- O que existe:
  - pagina de sem conexao.
- O que falta:
  - service worker;
  - cache offline real;
  - sincronizacao offline.

## 15. Funcionalidades de API sem tela principal

### 15.1 `/api/v1/dashboard/stats`
- Status: `operacional`
- Observacao:
  - continua disponivel, mas a trilha atual do CRM usa `metrics/overview`.

### 15.2 `/api/v1/analytics/dashboard`
- Status: `operacional`
- Observacao:
  - ainda nao ha tela principal dedicada em evidência nesta auditoria;
  - usa agregados de sessao e funil.

### 15.3 `/api/v1/content/:section/:key`
- Status: `operacional`
- Observacao:
  - sustenta CMS e editores.

## 16. Riscos funcionais prioritarios encontrados

1. O checklist de seguranca ainda combina verificacoes reais com flags de ambiente.
2. Landing e CMS ainda nao estao 100% acoplados em todas as secoes.
3. Uploads do CMS ainda dependem de filesystem local da API.
4. Google Calendar continua condicional a OAuth/envs externos.
5. O ambiente de homologacao ainda precisa de `db push` do schema novo na base remota para que as novas tabelas existam no banco da demo.

## 17. Proximo passo recomendado de auditoria

Para a proxima fase de validacao funcional, executar testes manuais e tecnicos por modulo nesta ordem:

1. Auth e perfis
2. Leads
3. Agenda
4. Financeiro
5. Dashboard
6. Seguranca
7. Colaboradores / RBAC
8. CMS / publish
9. Landing captacao

Cada modulo deve ser validado com:
- fluxo feliz;
- fluxo de erro;
- persistencia real no banco;
- reflexo correto no dashboard e metricas canonicas;
- checagem de autorizacao e permissao.
