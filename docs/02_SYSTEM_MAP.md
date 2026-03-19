# 02 System Map

## Monorepo

```text
apps/
  api/       -> backend principal
  crm/       -> painel autenticado
  landing/   -> site publico
packages/
  types/     -> contratos e regras de acesso
  utils/     -> utilitarios compartilhados
  ui/        -> componentes compartilhados
docs/        -> documentacao operacional e tecnica
.github/     -> CI e deploy de homologacao
```

## Apps

### API
- Stack: `Express`, `Prisma`, `PostgreSQL`, `Redis`, `Socket.IO`.
- Responsabilidades:
  - autenticacao e sessao;
  - autorizacao por permissao;
  - leads, agenda, financeiro e conteudo;
  - seguranca, privacidade e auditoria;
  - integracoes de e-mail, SMS e Google Calendar.

### CRM
- Stack: `Next.js 14`, `NextAuth`, `React`.
- Responsabilidades:
  - login e fluxo de 2FA;
  - operacao de leads, agenda e financeiro;
  - configuracoes do usuario;
  - gestao de colaboradores;
  - consumo das APIs autenticadas.

### Landing
- Stack: `Next.js 14`.
- Responsabilidades:
  - pagina publica;
  - captura de leads;
  - exibicao do conteudo publicado pelo CMS.

## Pacotes compartilhados

### `@viviani/types`
- Define `UserRole`, `UserProfile`, `AppPermission` e contratos de autenticacao.
- E a fonte principal das regras de permissao entre API e CRM.

### `@viviani/utils`
- Funcoes utilitarias reutilizadas entre apps.

### `@viviani/ui`
- Componentes e primitives compartilhados.

## Infraestrutura prevista no codigo
- PostgreSQL para dados transacionais.
- Redis para refresh tokens, estados de 2FA e caches.
- SMTP para e-mail operacional.
- Twilio ou simulacao por log para SMS.
- Vercel para `landing` e `crm` em homologacao.
- API com deploy fora do workflow do repositorio.
