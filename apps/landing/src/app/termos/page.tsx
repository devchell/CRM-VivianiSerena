import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de uso do site Viviani Serena.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream px-6 py-16 text-charcoal">
      <article className="container-main max-w-3xl rounded-2xl bg-white p-8 shadow-sm md:p-12">
        <Link href="/" className="text-sm font-medium text-rose-gold underline underline-offset-4">
          Voltar para o site
        </Link>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-rose-gold">Viviani Serena</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Termos de Uso</h1>
        <p className="mt-4 text-sm text-charcoal/60">Última atualização: 31 de agosto de 2026</p>

        <div className="prose prose-stone mt-10 max-w-none">
          <p>Ao utilizar este site, você concorda com as regras abaixo e com a Política de Privacidade.</p>
          <h2>Informações do site</h2>
          <p>O conteúdo é informativo e apresenta serviços de remoção a laser e canais de contato. O preenchimento do formulário não confirma agendamento, preço ou resultado clínico.</p>
          <h2>Agendamento e atendimento</h2>
          <p>Data, disponibilidade, avaliação e condições comerciais são confirmadas diretamente pela equipe da Viviani Serena. Cada caso deve ser avaliado individualmente.</p>
          <h2>Uso adequado</h2>
          <p>Não use o formulário para enviar conteúdo ilegal, automatizado, ofensivo ou dados de terceiros sem autorização. Podemos bloquear abusos e descartar solicitações que violem estas regras.</p>
          <h2>Contato</h2>
          <p>Para dúvidas sobre estes termos, escreva para contato@vivianiserena.com.</p>
          <p className="text-sm text-charcoal/60">Este texto é a versão operacional do projeto e deve passar por revisão jurídica antes de ser considerado documento definitivo.</p>
        </div>
      </article>
    </main>
  )
}
