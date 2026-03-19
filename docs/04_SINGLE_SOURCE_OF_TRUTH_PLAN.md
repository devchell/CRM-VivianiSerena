# 04 Single Source Of Truth Plan

## Objetivo
Definir claramente onde cada dado e decidido para evitar drift entre CRM, landing e API.

## Fonte oficial por dominio

### Acesso e permissao
- Fonte oficial: `packages/types` + middleware da API.
- O frontend so consome o contexto autorizado.

### Leads
- Fonte oficial: rotas e repositorios da API.
- O CRM nao deve recalcular status ou permissao localmente.

### Agenda
- Fonte oficial: API.
- Conflitos, status e integracao externa devem sair do backend.

### Financeiro
- Fonte oficial: API.
- Totais e agregacoes devem nascer do backend.

### Conteudo
- Fonte oficial: API + versionamento.
- Landing apenas exibe o conteudo publicado.

### Seguranca e privacidade
- Fonte oficial: API.
- Frontend nao deve assumir permissao por menu.

## Regras praticas
- Nenhuma tela decide sozinha se o usuario pode executar uma acao.
- Nenhum modulo sensivel depende apenas de esconder item de menu.
- Toda agregacao exibida no CRM deve ser rastreavel ate a rota da API.
- Tipos compartilhados sao a referencia para perfis, roles e permissoes.
