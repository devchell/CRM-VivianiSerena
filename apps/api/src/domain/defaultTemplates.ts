// ── Default templates for all lead statuses, origins, and auto-templates ──

function baseEmailHtml(opts: {
  tag: string
  tagColor?: string
  title: string
  body: string
  ctaText?: string
  ctaUrl?: string
  footerNote?: string
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#EEF3FA;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEF3FA" style="padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0"
  style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #BCCCDC;">

  <!-- HEADER -->
  <tr><td bgcolor="#0F172A" style="padding:28px 32px;text-align:center;">
    <p style="margin:0 0 8px;font-size:11px;color:#627D98;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
      ${opts.tag}
    </p>
    <h1 style="margin:0;font-size:24px;color:#FFFFFF;font-weight:700;line-height:1.3;">
      ${opts.title}
    </h1>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:32px;">
    ${opts.body}
  </td></tr>

  ${opts.ctaText && opts.ctaUrl ? `
  <!-- CTA -->
  <tr><td style="padding:0 32px 32px;text-align:center;">
    <a href="${opts.ctaUrl}" target="_blank"
      style="display:inline-block;padding:14px 32px;background:#C9A96E;border-radius:8px;
        font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#FFFFFF;
        text-decoration:none;font-weight:700;">
      ${opts.ctaText}
    </a>
  </td></tr>` : ''}

  <!-- FOOTER -->
  <tr><td bgcolor="#F1F5F9" style="padding:20px 32px;text-align:center;border-top:1px solid #BCCCDC;">
    <p style="margin:0;font-size:12px;color:#627D98;line-height:1.6;">
      ${opts.footerNote ?? 'Viviani Serena Coaching &middot; Mooca &amp; Santo Andr\u00e9, S\u00e3o Paulo'}
    </p>
    <p style="margin:4px 0 0;font-size:11px;color:#829AB1;">
      Voc\u00ea recebeu este e-mail porque tem um atendimento conosco.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function bodyText(paragraphs: string[]): string {
  return paragraphs.map(p =>
    `<p style="margin:0 0 16px;font-size:15px;color:#334E68;line-height:1.7;">${p}</p>`
  ).join('')
}

// ── Templates por status ────────────────────────────────────────────────

export const DEFAULT_TEMPLATES: Record<string, Record<string, { subject: string; body: string }>> = {

  // ── NOVOS ─────────────────────────────────────────────────────────────
  new: {
    email: {
      subject: 'Ol\u00e1, {nome}! Recebemos seu contato',
      body: baseEmailHtml({
        tag: 'Novo contato',
        title: 'Que bom te conhecer, {nome}!',
        body: bodyText([
          'Recebemos seu contato e ficamos muito felizes com seu interesse nos nossos servi\u00e7os.',
          'Em breve entraremos em contato para entender melhor o que voc\u00ea precisa e apresentar as melhores op\u00e7\u00f5es para voc\u00ea.',
          'Enquanto isso, se tiver alguma d\u00favida, pode responder este e-mail ou nos chamar no WhatsApp.',
        ]),
        ctaText: 'Conhecer nossos servi\u00e7os',
        ctaUrl: 'https://vivianiserena.com.br',
      }),
    },
    whatsapp: {
      subject: '',
      body: `Ol\u00e1 {nome}!\n\nRecebemos seu contato e estamos muito felizes com seu interesse!\n\nEm breve nossa equipe entrar\u00e1 em contato para apresentar as melhores op\u00e7\u00f5es para voc\u00ea.\n\nQualquer d\u00favida, estamos aqui!`,
    },
  },

  // ── EM CONTATO ────────────────────────────────────────────────────────
  contacted: {
    email: {
      subject: '{nome}, sua consulta est\u00e1 avan\u00e7ando!',
      body: baseEmailHtml({
        tag: 'Em atendimento',
        title: 'Estamos em contato, {nome}!',
        body: bodyText([
          'Nossa equipe j\u00e1 est\u00e1 avaliando seu caso com aten\u00e7\u00e3o e carinho.',
          'Em breve voc\u00ea receber\u00e1 todas as informa\u00e7\u00f5es necess\u00e1rias para dar o pr\u00f3ximo passo.',
          'Estamos aqui para tornar sua experi\u00eancia a melhor poss\u00edvel.',
        ]),
        ctaText: 'Falar no WhatsApp',
        ctaUrl: 'https://wa.me/5511915751770',
      }),
    },
    whatsapp: {
      subject: '',
      body: `Oi {nome}!\n\nNossa equipe j\u00e1 est\u00e1 analisando seu caso.\n\nEm breve retornaremos com mais informa\u00e7\u00f5es. Se precisar de algo antes, \u00e9 s\u00f3 chamar!`,
    },
  },

  // ── QUALIFICADOS ──────────────────────────────────────────────────────
  qualified: {
    email: {
      subject: '{nome}, temos uma proposta especial para voc\u00ea!',
      body: baseEmailHtml({
        tag: 'Proposta personalizada',
        title: 'Seu protocolo est\u00e1 pronto, {nome}!',
        body: bodyText([
          'Analisamos seu caso com cuidado e temos \u00f3timas not\u00edcias: temos o protocolo ideal para voc\u00ea!',
          'Nossa especialista preparou uma avalia\u00e7\u00e3o personalizada considerando suas necessidades espec\u00edficas.',
          'Agende agora sua consulta gratuita e descubra como podemos transformar sua pele.',
        ]),
        ctaText: 'Agendar avalia\u00e7\u00e3o gratuita',
        ctaUrl: 'https://vivianiserena.com.br#contato',
      }),
    },
    whatsapp: {
      subject: '',
      body: `{nome}, temos boas not\u00edcias!\n\nAnalisamos seu perfil e preparamos um protocolo especial para voc\u00ea.\n\nQue tal agendar uma avalia\u00e7\u00e3o gratuita para conhecer todos os detalhes?\n\nAcesse: https://vivianiserena.com.br`,
    },
  },

  // ── CONVERTIDOS ───────────────────────────────────────────────────────
  converted: {
    email: {
      subject: 'Bem-vinda \u00e0 fam\u00edlia Viviani Serena, {nome}!',
      body: baseEmailHtml({
        tag: 'Seja bem-vinda!',
        title: 'Sua jornada come\u00e7a agora, {nome}!',
        body: bodyText([
          'Seja muito bem-vinda! Estamos honradas em fazer parte da sua jornada.',
          'Nosso compromisso \u00e9 oferecer resultados reais com seguran\u00e7a, cuidado e tecnologia de ponta.',
          'Em breve voc\u00ea receber\u00e1 todas as orienta\u00e7\u00f5es para sua primeira sess\u00e3o. Qualquer d\u00favida, estamos aqui.',
        ]),
        ctaText: 'Ver meu agendamento',
        ctaUrl: 'https://vivianiserena.com.br',
        footerNote: 'Obrigada por confiar em n\u00f3s &middot; Viviani Serena Coaching',
      }),
    },
    whatsapp: {
      subject: '',
      body: `{nome}, seja muito bem-vinda!\n\nEstamos super felizes em ter voc\u00ea como nossa cliente!\n\nEm breve voc\u00ea receber\u00e1 todas as orienta\u00e7\u00f5es para sua primeira sess\u00e3o.\n\nQualquer d\u00favida, pode chamar. Vamos juntas nessa jornada!`,
    },
  },

  // ── PERDIDOS ──────────────────────────────────────────────────────────
  lost: {
    email: {
      subject: '{nome}, ainda pensando? Estamos aqui',
      body: baseEmailHtml({
        tag: 'Ainda podemos ajudar',
        title: 'Quando estiver pronta, {nome}!',
        body: bodyText([
          'Percebemos que voc\u00ea ainda n\u00e3o deu o pr\u00f3ximo passo, e tudo bem \u2014 sabemos que cada momento \u00e9 \u00fanico.',
          'Quando sentir que \u00e9 a hora certa, estaremos aqui para oferecer o melhor cuidado para voc\u00ea.',
          'Se tiver alguma d\u00favida ou quiser conversar sem compromisso, \u00e9 s\u00f3 nos chamar.',
        ]),
        ctaText: 'Quero saber mais',
        ctaUrl: 'https://vivianiserena.com.br',
      }),
    },
    whatsapp: {
      subject: '',
      body: `Oi {nome}!\n\nPassamos aqui s\u00f3 para dizer que, quando estiver pronta, estaremos aqui.\n\nN\u00e3o h\u00e1 pressa \u2014 cada jornada tem seu tempo.\n\nSe quiser conversar, \u00e9 s\u00f3 chamar!`,
    },
  },
}

// ── Templates por origem ────────────────────────────────────────────────

export const ORIGIN_TEMPLATES: Record<string, { label: string; emailSnippet: string; whatsapp: string }> = {
  instagram: {
    label: 'Instagram',
    emailSnippet: `<p style="margin:0 0 16px;font-size:15px;color:#334E68;line-height:1.7;">Que bom que nos encontrou pelo Instagram, {nome}! Por l\u00e1 compartilhamos resultados reais e dicas de cuidados com a pele todos os dias.</p>`,
    whatsapp: `Oi {nome}! Que bom te conhecer pelo Instagram.\n\nPor l\u00e1 compartilhamos resultados reais todo dia. Ficamos felizes com seu interesse e em breve entraremos em contato!`,
  },
  facebook: {
    label: 'Facebook',
    emailSnippet: `<p style="margin:0 0 16px;font-size:15px;color:#334E68;line-height:1.7;">Obrigada por nos encontrar pelo Facebook, {nome}! Nossa comunidade cresce a cada dia e estamos felizes que voc\u00ea faz parte dela.</p>`,
    whatsapp: `Oi {nome}! Que alegria te encontrar pelo Facebook.\n\nObrigada pelo interesse. Em breve nossa equipe entrar\u00e1 em contato!`,
  },
  google_ads: {
    label: 'Google Ads',
    emailSnippet: `<p style="margin:0 0 16px;font-size:15px;color:#334E68;line-height:1.7;">Voc\u00ea nos encontrou exatamente quando precisava, {nome}! O Google nos aproximou e estamos ansiosas para mostrar o que podemos fazer por voc\u00ea.</p>`,
    whatsapp: `Oi {nome}! Voc\u00ea nos encontrou no Google \u2014 \u00f3tima escolha.\n\nEstamos ansiosas para conversar com voc\u00ea. Em breve entramos em contato!`,
  },
  organic: {
    label: 'Busca org\u00e2nica',
    emailSnippet: `<p style="margin:0 0 16px;font-size:15px;color:#334E68;line-height:1.7;">Voc\u00ea nos encontrou organicamente, {nome} \u2014 isso significa que chegou at\u00e9 n\u00f3s no momento certo! Estamos prontas para ajud\u00e1-la nessa jornada.</p>`,
    whatsapp: `Oi {nome}! Que bom que nos encontrou.\n\nEstamos prontas para te ajudar nessa jornada. Em breve nossa equipe entrar\u00e1 em contato com todas as informa\u00e7\u00f5es!`,
  },
  referral: {
    label: 'Indica\u00e7\u00e3o',
    emailSnippet: `<p style="margin:0 0 16px;font-size:15px;color:#334E68;line-height:1.7;">Recebemos sua indica\u00e7\u00e3o com muito carinho, {nome}! Quando algu\u00e9m nos indica, \u00e9 a maior prova de confian\u00e7a que podemos receber. Prometemos fazer jus a ela.</p>`,
    whatsapp: `Oi {nome}! Recebemos sua indica\u00e7\u00e3o com muito carinho.\n\nQuando algu\u00e9m nos indica \u00e9 a maior prova de confian\u00e7a. Prometemos fazer jus a ela! Em breve entramos em contato.`,
  },
  whatsapp: {
    label: 'WhatsApp',
    emailSnippet: `<p style="margin:0 0 16px;font-size:15px;color:#334E68;line-height:1.7;">Voc\u00ea nos chamou pelo WhatsApp, {nome}, e adoramos a iniciativa! Preferimos a comunica\u00e7\u00e3o pr\u00f3xima e direta \u2014 exatamente como voc\u00ea.</p>`,
    whatsapp: `Oi {nome}! Voc\u00ea nos chamou pelo WhatsApp \u2014 adoramos.\n\nEstamos aqui e em breve nossa equipe responder\u00e1 com todas as informa\u00e7\u00f5es. Pode contar com a gente!`,
  },
  other: {
    label: 'Outro canal',
    emailSnippet: `<p style="margin:0 0 16px;font-size:15px;color:#334E68;line-height:1.7;">Ficamos felizes que voc\u00ea nos encontrou, {nome}! Estamos prontas para te ajudar.</p>`,
    whatsapp: `Oi {nome}! Ficamos felizes com seu contato.\n\nEm breve nossa equipe entrar\u00e1 em contato com as melhores op\u00e7\u00f5es para voc\u00ea!`,
  },
}

// ── Templates autom\u00e1ticos ──────────────────────────────────────────────

export const DEFAULT_AUTO_TEMPLATES: Record<string, { subject?: string; emailHtml: string; whatsappText: string }> = {
  appointment_confirmation: {
    subject: 'Agendamento confirmado, {nome}!',
    emailHtml: baseEmailHtml({
      tag: 'Confirma\u00e7\u00e3o de agendamento',
      title: 'Seu agendamento est\u00e1 confirmado!',
      body: bodyText([
        'Ol\u00e1, {nome}! Seu agendamento foi confirmado com sucesso.',
        '<strong>Data:</strong> {data_agendamento}<br><strong>Hor\u00e1rio:</strong> {hora_agendamento}<br><strong>Servi\u00e7o:</strong> {servico}',
        'Caso precise remarcar ou cancelar, entre em contato com anteced\u00eancia m\u00ednima de 24 horas.',
      ]),
      ctaText: 'Falar no WhatsApp',
      ctaUrl: 'https://wa.me/5511915751770',
    }),
    whatsappText: `Agendamento confirmado.\n\nOl\u00e1 {nome}! Seu agendamento est\u00e1 confirmado:\n\nData: {data_agendamento}\nHor\u00e1rio: {hora_agendamento}\nServi\u00e7o: {servico}\n\nQualquer d\u00favida, \u00e9 s\u00f3 chamar! At\u00e9 breve.`,
  },

  appointment_reminder_24h: {
    subject: 'Lembrete: seu atendimento \u00e9 amanh\u00e3, {nome}!',
    emailHtml: baseEmailHtml({
      tag: 'Lembrete \u2014 24 horas',
      title: 'Seu atendimento \u00e9 amanh\u00e3!',
      body: bodyText([
        'Ol\u00e1, {nome}! Passamos para lembrar que seu atendimento \u00e9 amanh\u00e3.',
        '<strong>Hor\u00e1rio:</strong> {hora_agendamento}<br><strong>Servi\u00e7o:</strong> {servico}',
        'Lembre-se de chegar com 10 minutos de anteced\u00eancia. Esperamos por voc\u00ea!',
      ]),
      ctaText: 'Preciso remarcar',
      ctaUrl: 'https://wa.me/5511915751770',
    }),
    whatsappText: `Lembrete de atendimento.\n\nOi {nome}! Seu atendimento \u00e9 amanh\u00e3 \u00e0s {hora_agendamento}.\n\nServi\u00e7o: {servico}\n\nLembre-se de chegar 10 minutinhos antes. At\u00e9 amanh\u00e3.`,
  },

  appointment_reminder_1h: {
    subject: '',
    emailHtml: '',
    whatsappText: `Seu atendimento \u00e9 em 1 hora.\n\nOi {nome}! S\u00f3 um lembrete r\u00e1pido: seu atendimento come\u00e7a em 1 hora.\n\nHor\u00e1rio: {hora_agendamento}\n\nAt\u00e9 j\u00e1.`,
  },

  appointment_cancellation: {
    subject: 'Agendamento cancelado \u2014 {nome}',
    emailHtml: baseEmailHtml({
      tag: 'Cancelamento',
      title: 'Seu agendamento foi cancelado',
      body: bodyText([
        'Ol\u00e1, {nome}. Confirmamos o cancelamento do seu agendamento.',
        'Quando quiser reagendar, estamos aqui! Ser\u00e1 um prazer receb\u00ea-la.',
      ]),
      ctaText: 'Reagendar agora',
      ctaUrl: 'https://vivianiserena.com.br#contato',
    }),
    whatsappText: `Oi {nome}! Confirmamos o cancelamento do seu agendamento.\n\nQuando quiser reagendar, \u00e9 s\u00f3 chamar. Estamos aqui.`,
  },

  lead_welcome: {
    subject: 'Ol\u00e1, {nome}! Recebemos seu contato',
    emailHtml: DEFAULT_TEMPLATES.new.email.body,
    whatsappText: DEFAULT_TEMPLATES.new.whatsapp.body,
  },

  lead_converted: {
    subject: 'Bem-vinda \u00e0 fam\u00edlia Viviani Serena, {nome}!',
    emailHtml: DEFAULT_TEMPLATES.converted.email.body,
    whatsappText: DEFAULT_TEMPLATES.converted.whatsapp.body,
  },

  auth_2fa: {
    subject: 'Seu c\u00f3digo de verifica\u00e7\u00e3o',
    emailHtml: baseEmailHtml({
      tag: 'Verifica\u00e7\u00e3o de seguran\u00e7a',
      title: 'C\u00f3digo de acesso',
      body: bodyText([
        'Use o c\u00f3digo abaixo para concluir seu login:',
        '<div style="text-align:center;margin:24px 0;"><span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0F172A;font-family:monospace;">{codigo}</span></div>',
        'Este c\u00f3digo expira em 10 minutos. Se voc\u00ea n\u00e3o solicitou este acesso, ignore este e-mail.',
      ]),
    }),
    whatsappText: `Seu c\u00f3digo de verifica\u00e7\u00e3o: *{codigo}*\n\nExpira em 10 minutos. Se n\u00e3o foi voc\u00ea, ignore.`,
  },
}

export function getDefaultTemplate(status: string, channel: string): { subject: string; body: string } | null {
  return DEFAULT_TEMPLATES[status]?.[channel] ?? null
}

export function getDefaultAutoTemplate(templateId: string): { subject?: string; emailHtml: string; whatsappText: string } | null {
  return DEFAULT_AUTO_TEMPLATES[templateId] ?? null
}
