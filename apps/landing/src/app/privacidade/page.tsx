import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Informações sobre o tratamento de dados no site Viviani Serena.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream px-6 py-16 text-charcoal">
      <article className="container-main max-w-3xl rounded-2xl bg-white p-8 shadow-sm md:p-12">
        <Link href="/" className="text-sm font-medium text-rose-gold underline underline-offset-4">
          Voltar para o site
        </Link>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-rose-gold">Viviani Serena</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Política de Privacidade</h1>
        <p className="mt-4 text-sm text-charcoal/60">Última atualização: 31 de agosto de 2026</p>

        <div className="prose prose-stone mt-10 max-w-none">
          <p>
            Esta página explica, de forma objetiva, como os dados enviados pelo formulário são tratados para que Viviani Serena possa responder ao seu pedido de contato e organizar uma avaliação.
          </p>
          <h2>Dados coletados</h2>
          <p>Nome, e-mail, telefone, serviço de interesse e informações técnicas básicas da navegação, quando disponíveis.</p>
          <h2>Finalidade e base</h2>
          <p>Os dados são usados para responder ao contato, agendar atendimento, manter o histórico operacional e melhorar o site. O formulário só é enviado após o aceite expresso desta política.</p>
          <h2>Compartilhamento e armazenamento</h2>
          <p>Os dados são armazenados no sistema operacional da Viviani Serena e acessados somente por pessoas autorizadas. Não vendemos dados pessoais. Integrações externas só são ativadas quando configuradas para uma finalidade operacional específica.</p>
          <h2>Seus direitos</h2>
          <p>Você pode solicitar confirmação, acesso, correção, anonimização ou eliminação dos dados pessoais, observadas as obrigações legais de retenção. Para solicitar atendimento, escreva para contato@vivianiserena.com.</p>
          <h2>Consentimento</h2>
          <p>O consentimento fica registrado com data, versão da política e canal de origem. Você pode revogá-lo entrando em contato pelo mesmo e-mail.</p>
          <p className="text-sm text-charcoal/60">Este texto é a versão operacional do projeto e deve passar por revisão jurídica antes de ser considerado documento definitivo.</p>
        </div>
      </article>
    </main>
  )
}
