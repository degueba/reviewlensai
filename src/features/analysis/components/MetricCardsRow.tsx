import { MetricCard } from './MetricCard'
import { useAnalysisStore } from '@/store/analysisStore'

export function MetricCardsRow() {
  const summary = useAnalysisStore((s) => s.summary)

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
