import { Search, PlusCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate } from 'react-router-dom'
import { useAnalysisStore } from '@/store/analysisStore'

interface AnalysisTopBarProps {
  onOpenChat: () => void
}

export function AnalysisTopBar({ onOpenChat }: AnalysisTopBarProps) {
  const navigate = useNavigate()
  const source = useAnalysisStore((s) => s.source)
  const isLoading = useAnalysisStore((s) => s.isLoading)
  const clearAnalysis = useAnalysisStore((s) => s.clearAnalysis)

  const handleNewAnalysis = () => {
    clearAnalysis()
    navigate('/')
  }

  const dateRange = source
    ? `${new Date(source.dateRange.from).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${new Date(source.dateRange.to).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : ''

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Search className="size-4 text-primary" />
          {isLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-foreground">
                {source?.platform ?? 'ReviewLens'} — {source?.url?.replace('https://www.trustpilot.com/review/', '') ?? ''}
              </p>
              {dateRange && <p className="text-xs text-muted-foreground">{dateRange}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNewAnalysis} className="gap-1.5">
            <PlusCircle className="size-3.5" />
            New Analysis
          </Button>
          <Button size="sm" onClick={onOpenChat} className="gap-1.5">
            <MessageSquare className="size-3.5" />
            Ask AI
          </Button>
        </div>
      </div>
    </header>
  )
}
