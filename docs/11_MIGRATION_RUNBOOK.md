# 11 Migration Runbook

## Objetivo
Migrar do ambiente Docker local para servicos gerenciados, reduzindo dependencia do PC local e elevando resiliencia operacional.

## Pre-condicoes
- build da API e do CRM corrigidos
- segredos rotacionados
- contratos CRM/API estabilizados
- fonte unica da verdade de metricas definida
- backup confiavel de banco e uploads

## Ordem recomendada

### 1. Congelamento
- congelar mudancas de schema
- exportar banco
- snapshot de uploads
- registrar versao exata do codigo

### 2. Provisionamento
- PostgreSQL gerenciado
- Redis gerenciado
- storage gerenciado
- ambiente de staging
- DNS e TLS planejados

### 3. Preparacao da aplicacao
- parametrizar URLs por ambiente
- migrar uploads locais para storage
- separar jobs e websocket da estrategia serverless
- validar health checks externos

### 4. Migracao de dados
- restaurar dump no banco gerenciado
- validar contagens por tabela
- sincronizar uploads
- rodar verificacao de integridade

### 5. Deploy em staging
- deploy da API
- deploy do CRM
- deploy da landing
- rodar smoke tests

### 6. Corte de producao
- freeze curto
- backup final
- aplicar migracao final diferencial, se houver
- atualizar variaveis e DNS
- liberar trafego gradualmente

## Como sair do Docker local
- manter Docker apenas como ambiente de desenvolvimento
- remover dependencia de:
  - volumes locais para uploads
  - cron embutido no container principal
  - Nginx manual como peca central obrigatoria

## Riscos da migracao
- divergencia de uploads entre origem e destino
- quebra de URLs hardcoded localhost
- falha de websocket por proxy inadequado
- falha de auth por segredo ou drift
- mudanca de timezone ou periodo em metricas

## Dados, backup e rollback

### Banco
- dump logico antes da migracao
- snapshot do provider apos restore
- roteiro de restore documentado

### Uploads
- copia integral
- checksum ou contagem de objetos
- janela de freeze se necessario

### Rollback
- manter ambiente antigo disponivel por periodo curto
- rollback por DNS, release anterior e restore validado, se necessario

## Checklist de validacao pos-migracao
- login funciona
- lead entra no CRM
- conteudo da landing carrega
- imagem nova sobe e abre
- websocket conecta
- metricas oficiais batem com a base esperada para o mesmo periodo

## Update apos preparacao final de deploy

- blueprint base para API preparado em `render.yaml`
- health checks operacionais padronizados em `/health/live`, `/health/ready` e `/health/deps`
- checklist final consolidado em `DEPLOY_CHECKLIST_FINAL.md`
