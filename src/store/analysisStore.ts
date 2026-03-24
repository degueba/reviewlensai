import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReviewSource, AnalysisSummary, Theme, Quote, Review, AnalysisPayload, ChatMessage } from '@/types'

interface AnalysisState {
  source: ReviewSource | null
  summary: AnalysisSummary | null
  themes: Theme[]
  quotes: Quote[]
  reviews: Review[]
  chatHistory: ChatMessage[]
  setAnalysis: (payload: AnalysisPayload) => void
  appendChatMessage: (msg: ChatMessage) => void
  clearAnalysis: () => void
  hasData: () => boolean
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      source: null,
      summary: null,
      themes: [],
      quotes: [],
      reviews: [],
      chatHistory: [],
      setAnalysis: (payload) =>
        set({
          source: payload.source,
          summary: payload.summary,
          themes: payload.themes,
          quotes: payload.quotes,
          reviews: payload.reviews,
          chatHistory: [],
        }),
      appendChatMessage: (msg) =>
        set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
      clearAnalysis: () =>
        set({ source: null, summary: null, themes: [], quotes: [], reviews: [], chatHistory: [] }),
      hasData: () => get().source !== null,
    }),
    {
      name: 'reviewlens-analysis',
      partialize: (state) => ({
        source: state.source,
        summary: state.summary,
        themes: state.themes,
        quotes: state.quotes,
        reviews: state.reviews,
        // chatHistory intentionally not persisted — ephemeral per session
      }),
    }
  )
)
