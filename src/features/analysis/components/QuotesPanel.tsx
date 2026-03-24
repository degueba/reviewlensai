import { cn } from '@/lib/utils'
import { useAnalysisStore } from '@/store/analysisStore'

const accentLeft = {
  positive: 'border-l-emerald-500',
  neutral: 'border-l-yellow-500',
  negative: 'border-l-red-500',
}

const badgeStyle = {
  positive: 'bg-emerald-500/10 text-emerald-400',
  neutral: 'bg-yellow-500/10 text-yellow-400',
  negative: 'bg-red-500/10 text-red-400',
}

export function QuotesPanel() {
  const quotes = useAnalysisStore((s) => s.quotes)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Key Quotes</h2>
      <div className="space-y-3">
        {quotes.map((quote) => (
          <blockquote
            key={quote.id}
            className={cn('border-l-2 pl-3', accentLeft[quote.sentiment])}
          >
            <p className="text-sm text-foreground/80 italic">"{quote.text}"</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">— {quote.author}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', badgeStyle[quote.sentiment])}>
                {quote.themeLabel}
              </span>
            </div>
          </blockquote>
        ))}
      </div>
    </div>
  )
}
