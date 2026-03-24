import { cn } from '@/lib/utils'
import { useAnalysisStore } from '@/store/analysisStore'
import { Skeleton } from '@/components/ui/skeleton'

const sentimentColor = {
  positive: 'bg-emerald-500',
  neutral: 'bg-yellow-500',
  negative: 'bg-red-500',
}

const sentimentBadge = {
  positive: 'bg-emerald-500/10 text-emerald-400',
  neutral: 'bg-yellow-500/10 text-yellow-400',
  negative: 'bg-red-500/10 text-red-400',
}

export function ThemesPanel() {
  const themes = useAnalysisStore((s) => s.themes)
  const isLoading = useAnalysisStore((s) => s.isLoading)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Themes Breakdown</h2>
      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))
          : themes.map((theme) => (
          <div key={theme.id}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{theme.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{theme.reviewCount} reviews</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', sentimentBadge[theme.sentiment])}>
                  {theme.sentiment}
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary">
              <div
                className={cn('h-1.5 rounded-full transition-all', sentimentColor[theme.sentiment])}
                style={{ width: `${theme.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
