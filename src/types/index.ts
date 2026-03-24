export type SentimentLabel = 'positive' | 'neutral' | 'negative'

export interface ReviewSource {
  id: string
  url: string | null
  platform: string
  analyzedAt: string
  reviewCount: number
  dateRange: {
    from: string
    to: string
  }
}

export interface Theme {
  id: string
  label: string
  sentiment: SentimentLabel
  reviewCount: number
  percentage: number
}

export interface Quote {
  id: string
  text: string
  author: string
  rating: number
  sentiment: SentimentLabel
  themeLabel: string
}

export interface Review {
  id: string
  author: string
  rating: number
  date: string
  text: string
  sentiment: SentimentLabel
  primaryTheme: string
}

export interface AnalysisSummary {
  sentimentScore: number
  totalReviews: number
  topPositiveTheme: string
  topNegativeTheme: string
  overview: string
}

export interface AnalysisPayload {
  source: ReviewSource
  summary: AnalysisSummary
  themes: Theme[]
  quotes: Quote[]
  reviews: Review[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'guardrail'
  content: string
  timestamp: string
}
