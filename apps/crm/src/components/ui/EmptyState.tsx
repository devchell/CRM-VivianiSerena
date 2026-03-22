interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-blush-200 bg-[#F7F4EF] px-4 py-3.5 text-center dark:border-[#3a3835] dark:bg-[#252423]">
      <span className="text-xs leading-relaxed text-charcoal-400 dark:text-charcoal-300">
        {message}
      </span>
    </div>
  )
}
