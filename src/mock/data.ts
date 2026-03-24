import type {
  ReviewSource,
  AnalysisSummary,
  Theme,
  Quote,
  Review,
  AnalysisPayload,
} from '@/types'

export const mockSource: ReviewSource = {
  id: 'src-001',
  url: 'https://www.trustpilot.com/review/flowboard.io',
  platform: 'Trustpilot',
  analyzedAt: '2026-03-23T18:00:00Z',
  reviewCount: 10,
  dateRange: { from: '2025-10-01', to: '2026-03-15' },
}

export const mockSummary: AnalysisSummary = {
  sentimentScore: 7.4,
  totalReviews: 10,
  topPositiveTheme: 'Ease of Use',
  topNegativeTheme: 'Pricing',
  overview:
    'Flowboard receives strong praise for its intuitive interface and collaboration features. The main friction point is pricing, which several users consider steep for small teams.',
}

export const mockThemes: Theme[] = [
  { id: 'th-1', label: 'Ease of Use', sentiment: 'positive', reviewCount: 7, percentage: 70 },
  { id: 'th-2', label: 'Collaboration', sentiment: 'positive', reviewCount: 6, percentage: 60 },
  { id: 'th-3', label: 'Pricing', sentiment: 'negative', reviewCount: 5, percentage: 50 },
  { id: 'th-4', label: 'Customer Support', sentiment: 'neutral', reviewCount: 4, percentage: 40 },
  { id: 'th-5', label: 'Performance', sentiment: 'positive', reviewCount: 3, percentage: 30 },
  { id: 'th-6', label: 'Mobile App', sentiment: 'negative', reviewCount: 2, percentage: 20 },
]

export const mockQuotes: Quote[] = [
  {
    id: 'q-1',
    text: 'Flowboard completely changed how our team handles project handoffs. It\'s intuitive and fast.',
    author: 'Sarah M.',
    rating: 5,
    sentiment: 'positive',
    themeLabel: 'Ease of Use',
  },
  {
    id: 'q-2',
    text: 'Great product but the pricing tiers are confusing. We ended up paying for features we don\'t use.',
    author: 'David K.',
    rating: 3,
    sentiment: 'negative',
    themeLabel: 'Pricing',
  },
  {
    id: 'q-3',
    text: 'Support team was responsive but took 3 days to resolve a billing issue. Could be faster.',
    author: 'Priya L.',
    rating: 3,
    sentiment: 'neutral',
    themeLabel: 'Customer Support',
  },
  {
    id: 'q-4',
    text: 'The real-time collaboration is honestly the best I\'ve seen in this category.',
    author: 'Tom R.',
    rating: 5,
    sentiment: 'positive',
    themeLabel: 'Collaboration',
  },
]

export const mockReviews: Review[] = [
  { id: 'r-1', author: 'Sarah M.', rating: 5, date: '2026-03-10', text: 'Flowboard completely changed how our team handles project handoffs. It\'s intuitive, fast, and the UI feels genuinely polished.', sentiment: 'positive', primaryTheme: 'Ease of Use' },
  { id: 'r-2', author: 'David K.', rating: 3, date: '2026-02-28', text: 'Great product but the pricing tiers are confusing. We ended up on a plan with features we don\'t use.', sentiment: 'negative', primaryTheme: 'Pricing' },
  { id: 'r-3', author: 'Tom R.', rating: 5, date: '2026-02-20', text: 'The real-time collaboration is the best I\'ve seen in this category. Multiple people editing the same board without conflict? Love it.', sentiment: 'positive', primaryTheme: 'Collaboration' },
  { id: 'r-4', author: 'Priya L.', rating: 3, date: '2026-02-14', text: 'Support team was responsive but it took 3 days to resolve a billing issue. For a paid tier I\'d expect faster turnaround.', sentiment: 'neutral', primaryTheme: 'Customer Support' },
  { id: 'r-5', author: 'Marcus J.', rating: 4, date: '2026-02-05', text: 'Solid tool. The dashboard loads fast and filters are snappy. Minor gripe: the mobile app crashes occasionally on Android.', sentiment: 'positive', primaryTheme: 'Performance' },
  { id: 'r-6', author: 'Elena W.', rating: 2, date: '2026-01-29', text: 'Overpriced for what it offers compared to competitors. Cancelled after the trial and moved to a cheaper alternative.', sentiment: 'negative', primaryTheme: 'Pricing' },
  { id: 'r-7', author: 'James T.', rating: 5, date: '2026-01-18', text: 'My whole agency uses Flowboard. Onboarding new clients takes minutes now. The templates are excellent.', sentiment: 'positive', primaryTheme: 'Ease of Use' },
  { id: 'r-8', author: 'Nadia O.', rating: 4, date: '2026-01-07', text: 'Really good product overall. Collaboration features shine. The mobile app needs work though — desktop is much better.', sentiment: 'positive', primaryTheme: 'Collaboration' },
  { id: 'r-9', author: 'Chris B.', rating: 1, date: '2025-12-20', text: 'The mobile app is barely functional. Half the features are missing and it crashes constantly. Frustrating.', sentiment: 'negative', primaryTheme: 'Mobile App' },
  { id: 'r-10', author: 'Yuki S.', rating: 5, date: '2025-11-30', text: 'Switched from a competitor 6 months ago and haven\'t looked back. The support team went above and beyond to help with migration.', sentiment: 'positive', primaryTheme: 'Customer Support' },
]

export const mockAnalysisPayload: AnalysisPayload = {
  source: mockSource,
  summary: mockSummary,
  themes: mockThemes,
  quotes: mockQuotes,
  reviews: mockReviews,
}
