import { useAnalysisStore } from '@/store/analysisStore'
import { ReviewCard } from './ReviewCard'

export function ReviewCardsSection() {
  const reviews = useAnalysisStore((s) => s.reviews)

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        All Reviews
        <span className="ml-2 text-xs font-normal text-muted-foreground">({reviews.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  )
}
