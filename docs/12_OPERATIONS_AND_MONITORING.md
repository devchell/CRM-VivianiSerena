# 12 Operations And Monitoring

## Estado atual
- a API escreve logs em arquivo local com `winston-daily-rotate-file`
- existe endpoint `/health`
- existe job interno de health check que gera `SecurityEvent`
- scripts de backup e health check foram pensados para Docker ou VPS
- nao existe observabilidade centralizada real

## Logs

### Atual
- logs locais em `./logs`
- rotacao diaria
- `morgan` + request logger + `winston`

### Recomendado
- stdout estruturado em JSON
- coleta centralizada pelo provider
- correlacao por `requestId`
- mascaramento de dados sensiveis

## Observabilidade
- adotar plataforma central para:
  - logs
  - traces
  - metricas de aplicacao
  - uptime

## Tracing
- instrumentar:
  - requests HTTP
  - queries Prisma
  - chamadas Redis
  - integracoes SMTP, Google e Twilio
  - uploads

## Metricas tecnicas
- latencia por rota
- taxa de erro por rota
- uso de CPU e memoria por instancia
- conexoes com banco e Redis
- estado de jobs e scheduler
- taxa de login e bloqueios

## Metricas de negocio
- leads validos por origem
- conversoes por periodo
- agendamentos criados, concluidos e no-show
- receita e despesa reconhecidas
- discrepancia entre superficies oficiais deve tender a zero sob mesmo filtro e periodo

## Health checks

### Atual
- `/health` verifica banco e Redis

### Recomendado
- `/health/live`
- `/health/ready`
- `/health/deps`
- checagem de storage e integracoes criticas degradadas

## Alertas
- API indisponivel
- erro 5xx acima do limiar
- falha de conexao com banco ou Redis
- falha recorrente em login ou refresh
- falha de upload
- job nao executado no horario
- backup ausente

## Backup

### Atual
- script de backup em container PostgreSQL no compose

### Recomendado
- backup gerenciado do banco com PITR
- retencao definida por ambiente
- teste periodico de restore
- storage versionado para uploads

## Retencao
- logs operacionais: 15 a 30 dias
- auditoria: prazo maior conforme politica
- backups: 30 dias ou mais conforme custo e risco
- eventos de seguranca: politica explicita

## Recuperacao de falhas
- rollback por release
- restore de banco validado
- reprocessamento de jobs, se aplicavel
- playbook para:
  - falha de banco
  - falha de Redis
  - falha de storage
  - falha de integracao Google, SMTP ou Twilio

## Acao recomendada imediata
1. Centralizar logs e health checks.
2. Separar readiness de liveness.
3. Definir alertas minimos de disponibilidade, auth e banco.
4. Testar backup e restore antes da migracao definitiva.

## Update apos preparacao final de deploy

- `logger` foi ajustado para priorizar stdout estruturado em producao e arquivos apenas quando `LOG_TO_FILES=true`
- health endpoints agora incluem liveness, readiness, dependencias e resumo
- README e `DEPLOY_CHECKLIST_FINAL.md` passaram a refletir o fluxo real de operacao
