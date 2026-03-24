import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAnalysisStore } from '@/store/analysisStore'
import { AnalysisTopBar, MetricCardsRow, ThemesPanel, QuotesPanel, ReviewCardsSection } from '@/features/analysis'
import { ChatDrawer } from '@/features/chat'
import { Button } from '@/components/ui/button'

export function AnalysisPage() {
  const isLoading = useAnalysisStore((s) => s.isLoading)
  const hasData = useAnalysisStore((s) => s.source !== null)
  const loadingError = useAnalysisStore((s) => s.loadingError)
  const clearAnalysis = useAnalysisStore((s) => s.clearAnalysis)
  const [chatOpen, setChatOpen] = useState(false)
  const navigate = useNavigate()

  if (!isLoading && !loadingError && !hasData) {
    return <Navigate to="/" replace />
  }

  if (loadingError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-destructive">{loadingError}</p>
        <Button variant="outline" onClick={() => { clearAnalysis(); navigate('/') }}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <AnalysisTopBar onOpenChat={() => setChatOpen(true)} />
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <MetricCardsRow />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ThemesPanel />
          <QuotesPanel />
        </div>
        <ReviewCardsSection />
      </main>
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
