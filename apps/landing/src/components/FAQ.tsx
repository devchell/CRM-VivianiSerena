'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import * as Accordion from '@radix-ui/react-accordion'
import { Plus, Minus } from 'lucide-react'
import { useInView } from '@/lib/hooks'
import { trackCTAClick } from '@/lib/analytics'

interface FAQItem {
  id: string
  question: string
  answer: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'É doloroso?',
    answer:
      'O procedimento gera uma sensação de calor e leve ardência — comparável a pequenas "borrachadas" na pele. A intensidade varia conforme o local e a sensibilidade de cada pessoa. Utilizamos técnicas de resfriamento durante a sessão para maximizar o conforto. A maioria das clientes relata que a expectativa é pior do que a realidade.',
  },
  {
    id: 'faq-2',
    question: 'Quantas sessões preciso?',
    answer:
      'O número de sessões varia de acordo com o tipo de pigmento, profundidade da aplicação, fotótipo da pele e área tratada. Em média, sobrancelhas e lábios requerem 3 a 6 sessões, tatuagens de 5 a 10 sessões, e micropigmentação capilar de 4 a 8 sessões. Na avaliação gratuita, faço uma estimativa personalizada para o seu caso.',
  },
  {
    id: 'faq-3',
    question: 'Funciona em qualquer tom de pele?',
    answer:
      'Sim! O laser Q-Switched Nd:YAG possui comprimentos de onda (1064nm e 532nm) que permitem tratar diferentes fotótipos com segurança. Peles mais escuras requerem parâmetros ajustados para evitar hiperpigmentação pós-inflamatória — é exatamente essa personalização que garante resultados seguros e eficazes para todas as tonalidades.',
  },
  {
    id: 'faq-4',
    question: 'Qual o intervalo entre sessões?',
    answer:
      'O intervalo mínimo entre sessões é de 4 a 6 semanas. Esse tempo é necessário para que a pele se recupere completamente e o organismo elimine os fragmentos de pigmento fragmentados pelo laser. Respeitar esse intervalo é fundamental para otimizar os resultados e garantir a segurança do procedimento.',
  },
  {
    id: 'faq-5',
    question: 'Tem contraindicações?',
    answer:
      'Sim. O procedimento não é recomendado para gestantes, pessoas com epilepsia fotossensível, uso recente de isotretinoína (Roacutan), queloides, pele bronzeada recente ou doenças autoimunes ativas. Por isso, a avaliação prévia é obrigatória — ela existe para garantir que o tratamento seja seguro especificamente para você.',
  },
  {
    id: 'faq-6',
    question: 'Qual tecnologia é utilizada?',
    answer:
      'Utilizamos o laser Q-Switched Nd:YAG, equipamento aprovado pela ANVISA e referência global em despigmentação. Ele emite pulsos de luz ultra-rápidos (nanosegundos) que fragmentam o pigmento sem danificar o tecido ao redor. A energia é absorvida seletivamente pelo pigmento, que é então eliminado naturalmente pelo sistema imunológico.',
  },
  {
    id: 'faq-7',
    question: 'Quanto custa?',
    answer:
      'O valor é definido na avaliação gratuita, após análise do caso específico. O investimento varia conforme a área, tipo de pigmento e número estimado de sessões. Ofereço condições de parcelamento e pacotes de sessões com condições especiais. A avaliação é totalmente gratuita e sem compromisso.',
  },
  {
    id: 'faq-8',
    question: 'Como agendo minha avaliação gratuita?',
    answer:
      'É simples! Você pode preencher o formulário nesta página, enviar uma mensagem pelo WhatsApp (11) 91575-1770, ou entrar em contato pelo Instagram @vivini.serena. O agendamento é rápido — respondemos em até 24 horas para confirmar data e horário no espaço mais próximo de você.',
  },
]

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
}

interface FAQProps {
  whatsappNumber?: string
}

export default function FAQ({ whatsappNumber }: FAQProps = {}) {
  const [openItem, setOpenItem] = useState<string>('')
  const { ref: headerRef, isInView } = useInView()
  const waHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : 'https://wa.link/e2g7ii'

  return (
    <>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />

      <section
        id="faq"
        className="section bg-cream-50"
        aria-labelledby="faq-heading"
      >
        <div className="container-main max-w-3xl">
          {/* Header */}
          <motion.div
            ref={headerRef as React.RefObject<HTMLDivElement>}
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-rose-gold text-sm font-semibold uppercase tracking-[0.2em]">
              Dúvidas Frequentes
            </span>
            <h2 id="faq-heading" className="heading-lg text-charcoal mt-2 mb-4">
              Eliminando suas dúvidas
            </h2>
            <p className="text-charcoal-500">
              Antes de tomar qualquer decisão, é natural ter perguntas. Aqui estão as respostas mais completas.
            </p>
          </motion.div>

          {/* Accordion */}
          <Accordion.Root
            type="single"
            collapsible
            value={openItem}
            onValueChange={(val) => {
              setOpenItem(val)
              if (val) trackCTAClick('faq_open', val)
            }}
            className="space-y-3"
          >
            {FAQ_ITEMS.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Accordion.Item value={item.id} className="group">
                  <Accordion.Header>
                    <Accordion.Trigger
                      className={`w-full flex items-center justify-between gap-4 text-left px-6 py-5 rounded-lg font-medium transition-all duration-200 ${
                        openItem === item.id
                          ? 'bg-rose-gold text-white shadow-md'
                          : 'bg-white text-charcoal border border-stone-100 hover:border-rose-gold/30 hover:shadow-sm'
                      }`}
                      aria-expanded={openItem === item.id}
                    >
                      <span className="text-sm md:text-base">{item.question}</span>
                      <span className="flex-shrink-0">
                        {openItem === item.id ? (
                          <Minus className="w-5 h-5" aria-hidden="true" />
                        ) : (
                          <Plus className="w-5 h-5 text-rose-gold group-hover:text-rose-gold" aria-hidden="true" />
                        )}
                      </span>
                    </Accordion.Trigger>
                  </Accordion.Header>

                  <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="px-6 py-5 text-charcoal-600 text-sm leading-relaxed border border-t-0 border-stone-100 rounded-b-lg bg-white">
                      {item.answer}
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              </motion.div>
            ))}
          </Accordion.Root>

          {/* Bottom CTA */}
          <motion.div
            className="mt-12 text-center p-8 bg-blush rounded-lg border border-rose-gold/20"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <p className="text-charcoal font-semibold mb-2">Ainda tem dúvidas?</p>
            <p className="text-charcoal-500 text-sm mb-5">Fale diretamente comigo — respondo com carinho e clareza.</p>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCTAClick('faq_whatsapp_cta', 'faq')}
              className="btn-primary inline-flex text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current mr-2" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Fale comigo no WhatsApp
            </a>
          </motion.div>
        </div>
      </section>
    </>
  )
}
