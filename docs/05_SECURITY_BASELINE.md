# 05 Security Baseline

## Objetivo
Este documento descreve o estado atual de seguranca do projeto, os riscos observados no codigo e na configuracao, e a linha de base recomendada para uma operacao 24/7 em ambiente gerenciado.

O foco nao e apenas "ter middleware de seguranca", mas garantir que autenticacao, autorizacao, segredos, validacao, integracoes, uploads e superficies administrativas estejam coerentes com a arquitetura alvo e com a fonte unica da verdade por dominio.

## Estado atual
Existe uma intencao clara de hardening:
- JWT assimetrico
- refresh token com Redis
- uso de `helmet`
- whitelists de CORS
- rate limit
- eventos de seguranca e auditoria
- 2FA

Mas a implementacao atual tem lacunas importantes. O sistema combina mecanismos corretos com falhas estruturais que reduzem a efetividade real da seguranca. Em alguns pontos, a seguranca existe apenas no discurso, na UI ou em artefatos parciais, sem correspondencia confiavel no backend.

## Superficies sensiveis mapeadas

### 1. Autenticacao e sessao
- `apps/api/src/routes/auth.ts`
- `apps/crm/src/auth.ts`
- cookies httpOnly + bearer token
- refresh token em Redis

### 2. Administracao de usuarios e permissoes
- `apps/api/src/routes/users.ts`
- sessoes do CRM com `role` e `allowedModules`

### 3. Conteudo administrativo
- `apps/crm/src/app/(dashboard)/editar-site/page.tsx`
- `apps/api/src/routes/content.ts`

### 4. Uploads e assets
- upload em `apps/api/src/routes/content.ts`
- persistencia local em disco

### 5. Integracoes externas
- SMTP
- Twilio
- Google OAuth / Calendar

### 6. Superficies metricas e operacionais
- dashboard do CRM
- seguranca
- analytics
- notificacoes

Essas superficies importam para seguranca porque dados simulados, estados parciais ou contratos quebrados prejudicam auditoria, rastreabilidade e resposta a incidente.

## Riscos encontrados

### Criticos
- Arquivos `.env` com material sensivel foram encontrados no workspace versionado.
- `apps/crm/next.config.mjs` injeta `NEXTAUTH_SECRET` em `env`, expondo segredo no bundle cliente.
- `apps/crm/src/app/(dashboard)/editar-site/page.tsx` usa `NEXT_PUBLIC_REVALIDATE_SECRET`, o que invalida o proprio conceito de segredo.
- `apps/api/src/routes/users.ts` tem `adminOnly` sem enforcement real; qualquer usuario autenticado pode acessar funcoes administrativas.

### Altos
- Estrategia de autenticacao esta duplicada entre cookies e bearer token, com contratos diferentes entre CRM e API.
- O fluxo de refresh do CRM espera retorno diferente do que a API realmente envia.
- O fluxo de 2FA finaliza sessao no CRM com `allowedModules: []`, criando potencial desalinhamento entre identidade autenticada e autorizacao efetiva.
- `trust proxy` nao esta configurado; atraz de Nginx ou plataforma gerenciada, `req.ip`, rate limit e logs de seguranca podem ficar incorretos.
- Uploads em disco local e servidos pela propria API aumentam risco operacional e dificultam controle de acesso, retencao e rastreabilidade.
- Parte da seguranca operacional exibida na UI usa dados simulados ou parcialmente sinteticos.

### Medios
- RBAC de modulo parece existir mais no front-end do que no backend.
- O enum de papeis observado no banco e a logica aplicada na API nao estao totalmente alinhados.
- Algumas dependencias de seguranca ou 2FA parecem estar sem uso real, o que aumenta ruido e ambiguidade.
- Nao ha evidencia de politica formal de rotacao de segredo, segregacao por ambiente e revogacao operacional.

## Autenticacao

### O que existe
- Login com e-mail/senha
- access token
- refresh token em Redis
- 2FA por OTP de e-mail e SMS
- troca obrigatoria de senha em primeiro acesso

### Problemas tecnicos observados
- O README sugere TOTP/Google Authenticator, mas o fluxo implementado e OTP por e-mail/SMS.
- A API define cookies sensiveis, mas o consumo principal do CRM parece usar bearer token.
- O CRM espera `refreshToken` no retorno de `/auth/refresh`, enquanto a API retorna essencialmente um novo access token e renova cookie.
- O fluxo de sessao apos 2FA nao preserva claramente o mesmo contexto de permissao que o login principal.

### Linha de base recomendada
- Escolher um modelo principal:
  - ou autenticacao por cookie com protecao CSRF adequada
  - ou autenticacao por bearer token com refresh server-side consistente
- Documentar um unico contrato de login, refresh, logout e 2FA.
- Garantir que o contexto de autorizacao seja derivado do backend, nao reconstruido no cliente.

## Autorizacao / RBAC

### O que existe
- `role`
- `allowedModules`
- middleware generico de autorizacao em algumas rotas

### Problemas observados
- Rotas administrativas de usuario estao abertas na pratica.
- `allowedModules` tem forte presenca na UI, mas sem garantia de enforcement equivalente na API.
- Papeis e modulos nao formam uma politica canonica documentada.

### Linha de base recomendada
- Toda rota sensivel precisa de verificacao no backend.
- `role` e `allowedModules` devem ser avaliados server-side.
- Definir matriz de acesso por dominio:
  - usuarios
  - conteudo
  - leads
  - financeiro
  - seguranca
  - analytics
- Criar auditoria obrigatoria para:
  - criacao/edicao/remocao de usuarios
  - alteracao de permissao
  - exportacao de dados
  - alteracao de status comercial
  - publicacao de conteudo

## Validacao de entrada

### Pontos positivos
- Ha uso recorrente de `zod` na API.
- Prisma reduz risco de SQLi classica quando usado de forma padrao.

### Pontos frageis
- Landing e CRM enviam payloads divergentes do schema da API em fluxos importantes.
- Parte da defesa de entrada mistura validacao de dominio com filtros regex para SQLi/XSS.
- Conteudo rico e uploads merecem validacao e sanitizacao mais robustas no backend.

### Linha de base recomendada
- Validacao de contrato em toda borda de entrada.
- Sanitizacao de rich text no servidor antes de persistir ou publicar.
- Schemas compartilhados ou OpenAPI como contrato unico entre apps.
- Rejeicao explicita de payload desconhecido em rotas administrativas e de negocio.

## Exposicao de segredos

### Problemas observados
- Segredos foram encontrados em arquivos `.env` locais do projeto.
- Ha duplicacao de segredo entre raiz e apps.
- Segredos sensiveis foram empurrados para areas client-side.
- O repositorio atual indica risco real de drift e vazamento.

### Linha de base recomendada
- Nenhum segredo deve existir em arquivo versionado.
- Nenhum segredo deve ser publicado em `NEXT_PUBLIC_*`.
- Nenhum segredo deve ser copiado para `next.config env`.
- Toda injecao de segredo deve vir do provedor de ambiente, com escopo minimo.

## Variaveis de ambiente e segregacao

### Problemas observados
- Variaveis antigas convivem com variaveis usadas hoje.
- Scripts e codigo usam nomes diferentes para conceitos parecidos.
- Build, runtime, client e infraestrutura estao misturados.

### Linha de base recomendada
- Classificar tudo em quatro grupos:
  - client-public
  - server-runtime
  - build-time
  - infra-ops
- Cada ambiente (`demo`, `staging`, `production`) deve ter conjunto proprio de segredos.
- Rotacao deve ser suportada sem alterar codigo.

## CORS, headers, CSRF, XSS, SQLi e afins

### CORS
- O uso de whitelist e positivo.
- Precisa de governanca unica entre HTTP e Socket.IO.
- Sem `trust proxy`, controles por IP podem falhar.

### Headers
- `helmet` esta presente.
- Ha CSP em partes da stack.
- Algumas politicas ainda permitem `unsafe-inline` ou `unsafe-eval`, o que precisa ser reduzido quando possivel.

### CSRF
- Se cookies continuarem sendo credencial valida, a protecao CSRF precisa ser tratada como obrigatoria.
- Se bearer for o modelo unico, cookies sensiveis devem ser reavaliados.

### XSS
- Rich text e conteudo administrativo exigem sanitizacao forte server-side e renderizacao segura.
- Segredo em variavel publica ou injetado no bundle tambem representa superficie de exposicao.

### SQLi
- Prisma ajuda, mas nao substitui validacao.
- Regex de deteccao nao deve ser tratada como defesa principal.

## Uploads e arquivos

### Estado atual
- Upload em disco local pela API.
- Servico web faz papel de storage.

### Riscos
- dificuldade de escala horizontal
- perda de arquivo em rollback ou troca de instancia
- controle de acesso mais fragil
- ausencia de trilha operacional de objetos

### Linha de base recomendada
- object storage gerenciado
- metadado no banco
- URL assinada quando aplicavel
- politicas de retencao e exclusao por dominio

## Seguranca operacional e observabilidade

### Problemas observados
- Alguns indicadores de seguranca sao parcialmente simulados.
- Isso reduz a capacidade de confiar em score, atividade e estado operacional.

### Linha de base recomendada
- Eventos de seguranca devem vir de logs reais.
- Alertas para login anomalo, falha repetida, alteracao de permissao e uso administrativo.
- Trilha de auditoria imutavel ou pelo menos de acesso restrito.
- Integracao com observabilidade centralizada.

## Hardening prioritario recomendado
1. Rotacionar imediatamente todos os segredos observados no workspace atual.
2. Remover segredos de arquivos versionados e de qualquer superficie client-side.
3. Corrigir imediatamente `adminOnly` e revisar todas as rotas sensiveis.
4. Escolher e padronizar uma unica estrategia de autenticacao/refresh.
5. Configurar `trust proxy` conforme o ambiente gerenciado.
6. Revisar matriz de RBAC no backend por rota e por dominio.
7. Migrar uploads para object storage.
8. Eliminar indicadores de seguranca simulados em superficie operacional.
9. Implementar auditoria explicita para operacoes administrativas e sensiveis.
10. Criar governanca de segredo por ambiente, com rotacao e inventario.

## Conclusao
A base de seguranca do projeto tem componentes corretos, mas ainda nao forma um sistema confiavel de ponta a ponta. O maior risco atual nao vem de falta absoluta de mecanismos, e sim da combinacao de segredos expostos, autorizacao fragil, contratos inconsistentes e superficies administrativas com protecao parcial. O baseline recomendado e tornar o backend a autoridade real de identidade, permissao, auditoria e exposicao de dados, com segregacao rigorosa de segredos por ambiente.
## Update apos execucao da refatoracao

- `adminOnly` foi corrigido para bloquear acesso administrativo indevido.
- `NEXTAUTH_SECRET` deixou de ser exposto no bundle client do CRM.
- Publicacao da landing passou a depender de endpoint autenticado no backend.
- Middleware de autenticacao passou a aceitar `Bearer` e cookie `access_token`.
- Health endpoints foram adicionados para operacao e readiness em ambiente gerenciado.
