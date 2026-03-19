# 05 Security Baseline

## Linha de base atual
- JWT de acesso e refresh token com Redis.
- Middleware de autenticacao e autorizacao no backend.
- Auditoria de acoes sensiveis.
- 2FA com canais independentes.

## Modelo de acesso vigente

### Perfis
- `ADMIN`
- `COLLABORATOR`
- `VIEWER`

### Restricoes
- `editar-site`, `seguranca`, `colaboradores` e `privacidade` sao `ADMIN` only.
- `COLLABORATOR` e `VIEWER` ficam restritos a `dashboard`, `leads`, `agenda` e `financeiro`.
- `VIEWER` e somente leitura dentro dos modulos liberados.

## 2FA
- Comeca desligado para usuarios novos e antigos.
- Pode ser ligado por:
  - `celular`
  - `e-mail`
  - ambos
- Se os dois canais forem desligados, o 2FA e desativado automaticamente.

## Colaboradores
- Contas `INACTIVE` ainda nao fizeram o primeiro login.
- Contas `ACTIVE` ja acessaram ao menos uma vez.
- E-mail de convite pode ser reenviado para contas inativas.

## Pontos que exigem disciplina operacional
- aplicar migracoes no banco real antes de depender de novas colunas;
- manter segredos fora do repositorio;
- validar SMTP e Redis em homologacao e producao;
- revisar periodicamente contas inativas e convites pendentes.
