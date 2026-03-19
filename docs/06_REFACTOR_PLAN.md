# 06 Refactor Plan

## Objetivo
Manter a base estavel enquanto a complexidade cresce, sem quebrar homologacao.

## Prioridades atuais

### 1. Cobertura automatizada
- adicionar testes de rotas criticas da API;
- introduzir testes E2E para login, colaboradores, leads e financeiro.

### 2. Observabilidade
- consolidar logs;
- centralizar alertas;
- formalizar health checks de dependencias.

### 3. Banco e migracoes
- aplicar migracao das colunas de 2FA no banco real;
- padronizar runbook de rollback e backup.

### 4. UX operacional
- revisar textos de erro e estados vazios;
- melhorar feedback de falha de SMTP e de integracoes externas.

### 5. Seguranca continua
- revisar periodicamente permissoes por modulo;
- garantir que novos modulos nascam com autorizacao backend desde o inicio.
