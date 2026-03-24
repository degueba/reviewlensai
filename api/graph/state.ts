import { Annotation } from '@langchain/langgraph'
import type { Review, Theme, Quote, AnalysisSummary } from '../types.js'
import type { ScrapedData } from '../scraper/itunes.js'

export const IngestStateAnnotation = Annotation.Root({
  scrapedData: Annotation<ScrapedData | null>(),
  reviews: Annotation<Review[]>(),
  themes: Annotation<Theme[]>(),
  quotes: Annotation<Quote[]>(),
  summary: Annotation<AnalysisSummary | null>(),
  error: Annotation<string | null>(),
})

export type IngestState = typeof IngestStateAnnotation.State

export const ChatStateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  reviewTexts: Annotation<string[]>(),
  isGuardrailed: Annotation<boolean>(),
  answer: Annotation<string>(),
})

export type ChatState = typeof ChatStateAnnotation.State
