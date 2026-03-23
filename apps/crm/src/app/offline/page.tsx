'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#1C1C1C] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-lg bg-blue-500/10 border border-blue-200 flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        </svg>
      </div>
      <h1 className="font-heading text-2xl font-bold text-white mb-2">Sem conexão</h1>
      <p className="text-slate-400 text-sm mb-8 max-w-xs">
        Você está offline. Verifique sua conexão com a internet e tente novamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
