/* Dynamic API media URLs are intentionally rendered with img; next/image cannot optimize the self-hosted API origin without a remote pattern. */
/* eslint-disable @next/next/no-img-element */

type PublicClientMedia = {
  id: string
  stage: 'before' | 'progress' | 'after'
  capturedAt: string
  width: number
  height: number
  url: string
}

type PublicClientFolder = {
  id: string
  title: string
  description: string | null
  serviceLabel: string | null
  media: PublicClientMedia[]
}

const stageLabels: Record<PublicClientMedia['stage'], string> = {
  before: 'Antes',
  progress: 'Acompanhamento',
  after: 'Depois',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

export default function ClientResults({ groups }: { groups: PublicClientFolder[] }) {
  if (groups.length === 0) return null

  return (
    <section id="resultados-clientes" className="section bg-cream-50" aria-labelledby="resultados-clientes-title">
      <div className="container-main">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label justify-center">Evoluções reais</span>
          <h2 id="resultados-clientes-title" className="mt-3 font-heading text-3xl font-semibold text-charcoal md:text-4xl">Acompanhe cada etapa</h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal-500">Resultados apresentados com autorização e respeito à história de cada cliente.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {groups.map((group) => (
            <article key={group.id} className="rounded-2xl border border-blush-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-heading text-xl font-semibold text-charcoal">{group.title}</h3>{group.serviceLabel && <p className="mt-1 text-sm text-rose-gold">{group.serviceLabel}</p>}</div>
              </div>
              {group.description && <p className="mt-3 text-sm leading-relaxed text-charcoal-500">{group.description}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {group.media.slice(0, 2).map((media) => <figure key={media.id} className="overflow-hidden rounded-xl bg-blush-50"><img src={media.url} alt={`${stageLabels[media.stage]} do resultado`} width={media.width} height={media.height} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" /><figcaption className="px-2.5 py-2 text-xs font-medium text-charcoal-500">{stageLabels[media.stage]}</figcaption></figure>)}
              </div>
              {group.media.length > 2 && <details className="mt-4 rounded-xl border border-blush-200 bg-blush-50/60"><summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-charcoal transition-colors hover:text-rose-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold">Ver linha do tempo ({group.media.length} registros)</summary><div className="grid gap-3 border-t border-blush-200 p-3 sm:grid-cols-3">{group.media.slice(2).map((media) => <figure key={media.id} className="overflow-hidden rounded-lg bg-white"><img src={media.url} alt={`${stageLabels[media.stage]} do resultado`} width={media.width} height={media.height} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" /><figcaption className="p-2 text-xs text-charcoal-500"><span className="block font-medium">{stageLabels[media.stage]}</span>{formatDate(media.capturedAt)}</figcaption></figure>)}</div></details>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
