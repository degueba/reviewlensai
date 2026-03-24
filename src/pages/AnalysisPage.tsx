import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAnalysisStore } from '@/store/analysisStore'
import { AnalysisTopBar, MetricCardsRow, ThemesPanel, QuotesPanel, ReviewCardsSection } from '@/features/analysis'
import { ChatDrawer } from '@/features/chat'

export function AnalysisPage() {
  const hasData = useAnalysisStore((s) => s.source !== null)
  const [chatOpen, setChatOpen] = useState(false)

  if (!hasData) {
    return <Navigate to="/" replace />
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
