# 03 Domain And Data Flow

## Dominios principais
- autenticacao e acesso
- comercial
- agenda
- financeiro
- conteudo
- seguranca e privacidade
- colaboradores

## Fluxo de autenticacao
1. Usuario envia e-mail e senha ao backend.
2. API valida credenciais e monta contexto de acesso.
3. Se 2FA estiver desligado, a sessao e criada imediatamente.
4. Se 2FA estiver ligado:
   - o sistema usa `celular`, `e-mail` ou ambos, conforme configuracao;
   - se ambos estiverem desligados, o 2FA fica desativado.
5. Tokens de acesso e refresh sao emitidos.

## Fluxo de colaboradores
1. `ADMIN` cria o colaborador.
2. API gera senha temporaria e tenta enviar o convite por e-mail.
3. Se o e-mail falhar, o colaborador continua em `Inativos`.
4. Na aba `Inativos`, o admin pode:
   - editar todos os campos;
   - reenviar e-mail;
   - excluir a conta.
5. Depois do primeiro login, a conta passa para `Ativos`.

## Regra de status do colaborador
- `INACTIVE`: `lastLogin = null`
- `ACTIVE`: `lastLogin != null`

## Fluxo comercial
1. Landing envia lead para a API.
2. CRM lista e atualiza leads.
3. Leads podem gerar agendamentos.
4. Eventos de lead e agenda alimentam indicadores.

## Fluxo financeiro
1. Lancamentos sao criados no CRM.
2. API persiste o financeiro no banco.
3. Dashboard e relatorios leem a API como fonte oficial.

## Fluxo de conteudo
1. `ADMIN` edita conteudo no CRM.
2. API versiona e publica o conteudo.
3. Landing consome o conteudo publicado.

## Fluxo de seguranca e privacidade
- Seguranca:
  - eventos;
  - estatisticas;
  - checklist;
  - acoes administrativas sensiveis.
- Privacidade:
  - exportacao e operacoes LGPD.
- Ambas ficam restritas ao perfil `ADMIN`.
