import { useAnalysisStore } from '@/store/analysisStore'
import { ReviewCard } from './ReviewCard'
import { Skeleton } from '@/components/ui/skeleton'

export function ReviewCardsSection() {
  const reviews = useAnalysisStore((s) => s.reviews)
  const isLoading = useAnalysisStore((s) => s.isLoading)

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        All Reviews
        {!isLoading && <span className="ml-2 text-xs font-normal text-muted-foreground">({reviews.length})</span>}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ))
          : reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
      </div>
    </div>
  )
}
