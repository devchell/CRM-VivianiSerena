'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-page)] p-6 text-center text-[var(--text-primary)]">
      <div className="w-20 h-20 rounded-lg bg-blue-500/10 border border-blue-200 flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-rose)" strokeWidth="1.5" className="h-10 w-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        </svg>
      </div>
      <h1 className="mb-2 font-heading text-2xl font-bold text-[var(--text-primary)]">Sem conexão</h1>
      <p className="mb-8 max-w-xs text-sm text-[var(--text-secondary)]">
        Você está offline. Verifique sua conexão com a internet e tente novamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
      >
        Tentar novamente
      </button>
    </div>
  )
}
