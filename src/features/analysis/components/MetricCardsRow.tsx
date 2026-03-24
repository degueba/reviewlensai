import { MetricCard } from './MetricCard'
import { useAnalysisStore } from '@/store/analysisStore'
import { Skeleton } from '@/components/ui/skeleton'

export function MetricCardsRow() {
  const summary = useAnalysisStore((s) => s.summary)
  const isLoading = useAnalysisStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (!summary) return null

  const scoreAccent: 'green' | 'yellow' | 'red' =
    summary.sentimentScore >= 8 ? 'green' : summary.sentimentScore >= 5 ? 'yellow' : 'red'

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Sentiment Score"
        value={`${summary.sentimentScore}/10`}
        sub="Overall"
        accent={scoreAccent}
      />
      <MetricCard
        label="Reviews Analyzed"
        value={summary.totalReviews}
        accent="default"
      />
      <MetricCard
        label="Top Positive Theme"
        value={summary.topPositiveTheme}
        accent="green"
      />
      <MetricCard
        label="Top Negative Theme"
        value={summary.topNegativeTheme}
        accent="red"
      />
    </div>
  )
}
