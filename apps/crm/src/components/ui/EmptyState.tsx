interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3.5 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <span className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
        {message}
      </span>
    </div>
  )
}
