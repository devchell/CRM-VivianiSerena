# 08 Deployment Architecture

## Principio
A arquitetura alvo precisa refletir os dominios e as responsabilidades reais do sistema. Nao basta trocar Docker local por um provedor qualquer. Se a fonte unica da verdade de metricas ficar mal definida, a infraestrutura nova apenas vai escalar a divergencia. Por isso, a proposta de deploy parte de dois principios:
- cada responsabilidade deve ficar na plataforma apropriada;
- a camada de metricas oficiais deve nascer no backend de dominio, nao na UI.

## Proposta de arquitetura 24/7

### Camada publica
- `apps/landing` em Vercel
- Responsabilidades:
  - marketing
  - conteudo publico
  - captura de intencao comercial
  - eventos de analytics para backend proprio

### Camada privada de interface
- `apps/crm` em Vercel
- Responsabilidades:
  - autenticacao web do operador
  - consumo dos endpoints canonicos
  - renderizacao de paineis, tabelas e relatorios
- Restricoes:
  - nao carregar segredo no client bundle
  - nao calcular KPI oficial no browser
  - nao depender de filesystem local

### Camada de API transacional
- `apps/api` em plataforma com processo persistente
- Recomendado: Render, Fly.io, Railway, ECS/Fargate ou equivalente
- Responsabilidades:
  - autenticacao e autorizacao
  - regras de negocio
  - camada canonica de metricas
  - integracoes externas
  - websocket
  - orquestracao de jobs ou workers

### Camada de jobs/workers
- Separar do processo web se os jobs permanecerem relevantes
- Responsabilidades:
  - cron
  - reconciliacao
  - reprocessamento de KPI
  - tarefas demoradas e integracoes

### Banco de dados
- PostgreSQL gerenciado
- Producao:
  - AWS RDS
  - Cloud SQL
  - Crunchy Bridge
- Demo/staging:
  - Neon
  - Supabase

### Redis
- Redis Cloud ou ElastiCache
- Responsabilidades:
  - cache
  - tokens/sessoes quando necessario
  - coordenacao leve
- Restricao:
  - cache de metricas deve ser versionado por definicao e periodo

### Storage
- S3, Cloudflare R2 ou equivalente
- Responsabilidades:
  - uploads
  - assets administrativos
  - derivados de imagem

### Observabilidade
- Sentry para erros
- Better Stack, Datadog, Grafana Cloud ou equivalente para logs e metricas
- OpenTelemetry para traces
- health checks externos e alertas

## O que pode ir para Vercel
- `apps/landing`
- `apps/crm`

## O que nao deve ir para Vercel no estado atual
- `apps/api`
- websocket Socket.IO
- jobs baseados em `node-cron`
- uploads dependentes de disco local

## Separacao ideal por dominio

### Comercial
- API transacional + banco
- Toda definicao oficial de lead, conversao e agendamento fica aqui

### Financeiro
- API transacional + banco
- KPI financeiro oficial e calculado aqui
- Integracao futura com faturamento, pagamento ou ERP entra aqui

### Analytics
- Eventos enviados pela landing/CRM para backend proprio
- Armazenamento separado de `Lead`
- Conversao so referencia `leadId` real quando existir

### Seguranca
- Auth, audit log, eventos de seguranca e trilhas administrativas na API
- UI apenas consome indicadores derivados

### Metricas oficiais
- Devem existir em modulo canonico do backend
- Nunca derivadas diretamente em widgets do CRM
- Nunca misturadas a mocks silenciosos

## Provedores gerenciados sugeridos

### Producao
- Landing/CRM: Vercel
- API: Render/Fly.io/ECS/Fargate
- Postgres: RDS/Cloud SQL/Crunchy Bridge
- Redis: Redis Cloud/ElastiCache
- Storage: S3/R2
- Observabilidade: Sentry + provedor de logs/metricas

### Demo
- Landing/CRM: Vercel
- API: o mesmo stack da producao, mas menor
- Postgres e Redis isolados da producao
- Storage separado
- dados mascarados ou seed controlado

## CI/CD de alto nivel

### Pull request
- lint
- typecheck
- build de todos os apps
- testes de contrato
- testes de consistencia de KPI

### Merge para `main`
- build de artefatos
- imagem versionada da API
- deploy em staging
- migracoes controladas
- smoke tests

### Promocao para producao
- janela de rollout
- backup e snapshot antes de migracao critica
- deploy rolling ou blue-green
- verificacao de health checks
- verificacao de dashboards oficiais

## Dependencias arquiteturais antes da migracao final
- corrigir build de `api` e `crm`
- remover segredos do client e do repositorio
- alinhar contratos `Lead`, `Appointment`, `Financial` e `Auth`
- separar analytics de CRM comercial
- definir camada central de metricas oficiais
- migrar uploads para object storage
- separar web e jobs se o processo continuar acumulando responsabilidades

## Arquitetura alvo resumida
- Vercel para interfaces web
- servico persistente para API
- banco, Redis e storage gerenciados
- modulo de metricas oficial no backend
- observabilidade completa
- ambientes demo e producao isolados

## Conclusao
O caminho correto nao e "subir o Docker em outro lugar". O caminho correto e colocar cada dominio na plataforma apropriada e garantir que os indicadores oficiais nascam do backend transacional, com contratos estaveis e fonte unica da verdade. Sem isso, qualquer deploy 24/7 continuara entregando operacao instavel e numeros conflitantes.
## Update apos execucao da refatoracao

- `landing` e `crm` continuam aptos para deploy separado em plataforma frontend.
- `api` foi preparada para health checks, processo persistente e separacao de responsabilidades.
- O contrato de metricas consolidado passou a viver no backend, reforcando a necessidade de API dedicada fora do ambiente client-only.
- O fluxo de publicacao da landing agora depende do backend autenticado, nao de segredo publico no browser.
