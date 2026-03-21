# 13 Environment Strategy

## Ambientes
- `staging`: homologacao
- `main`: producao

## Regras
- novas features entram primeiro em `staging`;
- migracoes de banco precisam ter runbook antes de ir para `main`;
- segredos sao separados por ambiente;
- homologacao pode usar dados e provedores proprios.

## Homologacao
- valida UX, permissao, integracao e conteudo antes da producao;
- deve refletir a mesma arquitetura da producao sempre que possivel.

## Producao
- publica somente mudanca validada em `staging`;
- exige rotacao de segredos se houver qualquer exposicao.
