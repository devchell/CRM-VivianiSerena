# Design DNA e auditoria visual — Viviani CRM

Data: 2026-08-31
Escopo: landing pública, autenticação, shell do CRM, dashboard e base compartilhada de componentes.

## Direção aprovada para implementação

### Landing pública

- Linguagem: editorial clínica, humana, precisa e silenciosa.
- Prioridade responsiva: celular, desktop, tablet.
- Paleta: marfim e areia para superfícies, carvão para texto, cobre queimado como único acento; verde fica restrito ao estado real do WhatsApp.
- Tipografia: sans para leitura e uma serif de apoio apenas em títulos de marca; sem efeitos de texto em gradiente.
- Forma: raio de 8px, bordas de 1px, sombras curtas e discretas.
- Composição: blocos com ritmo, imagem real local e CTAs claros; menos cartões soltos e menos elementos simultâneos.
- Movimento: entrada suave de conteúdo e parallax sutil somente na imagem do HERO, com o conteúdo em ritmo normal; sem partículas, pulse de urgência ou animação ornamental.

### CRM

- Linguagem: ferramenta de operação, não página de marketing.
- Prioridade responsiva: desktop, celular, tablet.
- Shell desktop: sidebar escura de largura fixa e conteúdo claro, com acento de cobre apenas para estado ativo.
- Shell mobile: sidebar escondida por padrão, acionada pelo botão do header em drawer.
- Forma: raio de 8px, borda visível, superfícies planas e tabelas legíveis; evitar card dentro de card.
- Movimento: transições curtas apenas em estado e navegação; nenhuma animação expressiva em dashboard/admin.

## Achados confirmados

| Severidade | Área | Achado | Correção exigida |
| --- | --- | --- | --- |
| P0 | CRM mobile | `display:flex` inline na sidebar anulava `hidden lg:flex`; em 390px o conteúdo ficava com aproximadamente 150px. | Remover o display inline, conectar o botão mobile ao estado da sidebar e validar em 390px. |
| P0 | Confiança pública | 20 depoimentos artificiais com nomes, fotos randomuser e notas eram injetados quando habilitados no CMS. | Remover do caminho público; exibir somente depoimentos reais vindos do painel/Google. |
| P1 | Landing | Partículas em canvas, 3D hover, gradientes ornamentais e glassmorphism excessivo criavam linguagem genérica e “de IA”. | Preservar a composição original, usar imagem real local, overlay apenas para leitura e parallax restrito ao background. |
| P1 | Landing | Estrelas Unicode, `Sparkles`, emojis/símbolos de serviço e badges de FOMO. | Usar ícones Lucide sem estrela ou omitir ornamentação; remover urgência fabricada. |
| P1 | Landing | Tokens CSS duplicados e overrides globais de `[class*="card"]` dificultavam previsibilidade visual. | Centralizar tokens e limitar estilos globais a primitivas sem efeitos ocultos. |
| P1 | CRM | Login e senha inicial usavam orbes/gradientes e `Sparkles` como marca. | Tela de acesso plana, contraste alto e marca tipográfica simples. |
| P1 | Integrações | Código para Google, SMTP e WhatsApp existe, mas depende de credenciais externas ainda não configuradas na VPS. | Manter estados explícitos no painel, testar caminhos sem configuração e não declarar envio real sem credencial válida. |
| P2 | Acessibilidade | Foco, movimento e feedback precisam ser revisados depois do redesign em navegador real. | Validar teclado, foco visível, `prefers-reduced-motion`, erros de formulário e navegação mobile. |

## Critérios de aceite visual

- Nenhuma ocorrência funcional de `Sparkles`, `Star`, estrela Unicode, emoji decorativo, partículas, 3D ou gradiente ornamental na landing/login/shell; o overlay de contraste do HERO é permitido.
- 390px: sem overflow horizontal; sidebar desktop ausente; menu mobile abre e fecha pelo header; CTA e formulários cabem sem corte.
- 1440px: navegação, grids e gráficos preservam leitura sem excesso de espaço vazio.
- Contraste de texto e foco visível permanecem válidos em claro e escuro.
- Depoimentos públicos ficam vazios quando não há fonte real, sem fallback inventado.
- APIs respondem com estado honesto para Google/SMTP/WhatsApp: configurado, conectado, pendente ou bloqueado.

## Verificação final da rodada — 2026-08-31

- Landing, shell do CRM, login, dashboard, leads e agenda receberam a mesma base de superfícies quentes, carvão, cobre e estados de sucesso/alerta.
- Foram removidos do caminho público os depoimentos artificiais, partículas, 3D, gradientes ornamentais, blur decorativo, `Sparkles`, estrelas decorativas e emojis de interface; o parallax do background foi preservado a pedido do responsável.
- Seções públicas de Sobre, Confiança, FAQ, Localização, formulário e CTA flutuante foram alinhadas ao DNA; o azul legado da landing foi substituído por cobre/tons neutros.
- No CRM, a ponte temporária de utilitários legados mantém telas ainda não refatoradas na mesma paleta sem alterar regras de negócio.
- Browser real confirmou CRM em 1440px e 390px: sem overflow horizontal, sidebar desktop ausente no celular, menu mobile funcional e sem erros de console nos módulos percorridos.
- A landing respondeu `200` por HTTP e o HTML público não contém símbolo de estrela decorativo, depoimento artificial ou `localhost`; o overlay de contraste do HERO permanece intencional. A navegação da landing pelo browser desta máquina foi bloqueada pelo cliente (`ERR_BLOCKED_BY_CLIENT`); portanto ela não é marcada como browser-verified aqui.

## Integrações e limite de evidência

- Google Calendar: OAuth precisa de client/secret/redirect e autorização da conta real.
- E-mail: SMTP precisa de host, usuário, senha e remetente; senha fica cifrada no banco.
- WhatsApp: Meta precisa de app, Embedded Signup, WABA, número aprovado e webhook.
- Até credenciais reais serem inseridas e um envio/evento confirmado, o sistema deve ser reportado como “fluxo implementado, integração externa pendente”, nunca como produção concluída.

## Upgrade da landing mantendo a versão original — 2026-09-01

- A estrutura anterior foi restaurada: HERO em imagem inteira, headline com sublinhado, CTAs, credenciais, carrossel e ritmo editorial.
- HERO usa `/images/viviani/retrato.jpg` como fallback local e mantém parallax sutil somente na imagem; texto e CTAs não sofrem deslocamento.
- Carrossel de avaliações foi mantido, mas agora aceita somente itens reais do painel/Google; não cria nomes, fotos, notas ou conteúdo de fallback.
- Removidos partículas, `Sparkles`, estrelas Unicode, emojis/símbolos decorativos, urgência padrão e hover roxo/rosa do Instagram.
- Ícones de serviços foram trocados por ícones Lucide contextuais; selo de certificação, SEO e demais imagens fixas usam arquivos locais.
- Evidência: lint e build da landing passaram; no remoto, os seis containers ficaram `healthy`, a landing retornou HTTP 200 e o HTML carregou o HERO local sem referências legadas.
- Limite: a porta 80 continua bloqueada pelo cliente de browser desta máquina (`ERR_BLOCKED_BY_CLIENT`); interação visual da landing não foi declarada como validada por browser.
