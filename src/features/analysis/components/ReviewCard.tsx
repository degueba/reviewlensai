import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Review } from '@/types'

interface ReviewCardProps {
  review: Review
}

const sentimentVariant = {
  positive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  neutral: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  negative: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
            {review.author.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{review.author}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(review.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'size-3',
                i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted'
              )}
            />
          ))}
        </div>
      </div>
      <p className="line-clamp-3 text-sm text-foreground/75 leading-relaxed">{review.text}</p>
      <div className="flex items-center gap-2">
        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium capitalize', sentimentVariant[review.sentiment])}>
          {review.sentiment}
        </span>
        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
          {review.primaryTheme}
        </Badge>
      </div>
    </div>
  )
}
