import { StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { IngestStateAnnotation, type IngestState } from './state.js'
import { CLASSIFY_SYSTEM_PROMPT } from '../prompts/classify.js'
import { QUOTES_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from '../prompts/summarize.js'
import type { Review, Theme, Quote, AnalysisSummary, AnalysisPayload } from '../types.js'
import type { ScrapedData } from '../scraper/itunes.js'
import { GraphError } from '../lib/errors.js'

const CLASSIFY_BATCH_SIZE = 20

// ── Node 1: assignIds ─────────────────────────────────────────────────────────
function assignIds(state: IngestState): Partial<IngestState> {
  const { scrapedData } = state
  if (!scrapedData) throw new GraphError('assignIds: scrapedData is null')

  const reviews: Review[] = scrapedData.reviews.slice(0, 15).map((r, i) => ({
    id: `r-${i + 1}`,
    author: r.author,
    rating: r.rating,
    date: r.dateIso,
    text: r.text,
    sentiment: 'neutral',
    primaryTheme: '',
  }))

  return { reviews }
}

// ── Node 2: classifyReviews ───────────────────────────────────────────────────
async function classifyReviews(state: IngestState): Promise<Partial<IngestState>> {
  const model = new ChatOpenAI({
    model: 'gpt-4.1-mini',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  })

  const reviews = [...state.reviews]
  const batches: Review[][] = []
  for (let i = 0; i < reviews.length; i += CLASSIFY_BATCH_SIZE) {
    batches.push(reviews.slice(i, i + CLASSIFY_BATCH_SIZE))
  }

  const responses = await Promise.all(
    batches.map((batch) =>
      model.invoke([
        { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(batch.map((r) => ({ text: r.text, author: r.author, rating: r.rating }))) },
      ])
    )
  )

  responses.forEach((response, b) => {
    const parsed = JSON.parse(response.content as string) as {
      classifications: Array<{ sentiment: 'positive' | 'neutral' | 'negative'; primaryTheme: string }>
    }
    parsed.classifications.forEach((c, idx) => {
      reviews[b * CLASSIFY_BATCH_SIZE + idx].sentiment = c.sentiment
      reviews[b * CLASSIFY_BATCH_SIZE + idx].primaryTheme = c.primaryTheme
    })
  })

  return { reviews }
}

// ── Node 3: extractThemes ─────────────────────────────────────────────────────
function extractThemes(state: IngestState): Partial<IngestState> {
  const groups = new Map<string, { sentiments: string[]; count: number }>()
  for (const r of state.reviews) {
    const key = r.primaryTheme || 'Uncategorized'
    const g = groups.get(key) ?? { sentiments: [], count: 0 }
    g.sentiments.push(r.sentiment)
    g.count++
    groups.set(key, g)
  }

  const total = state.reviews.length
  const themes: Theme[] = [...groups.entries()]
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([label, { sentiments, count }], i) => {
      const pos = sentiments.filter((s) => s === 'positive').length
      const neg = sentiments.filter((s) => s === 'negative').length
      const sentiment: 'positive' | 'neutral' | 'negative' =
        pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral'
      return {
        id: `th-${i + 1}`,
        label,
        sentiment,
        reviewCount: count,
        percentage: Math.round((count / total) * 100),
      }
    })

  return { themes }
}

// ── Node 4: extractQuotes ─────────────────────────────────────────────────────
async function extractQuotes(state: IngestState): Promise<Partial<IngestState>> {
  const model = new ChatOpenAI({
    model: 'gpt-4.1-mini',
    temperature: 0.2,
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await model.invoke([
    { role: 'system', content: QUOTES_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(state.reviews) },
  ])

  const parsed = JSON.parse(response.content as string) as { selectedIndices: number[] }

  const quotes: Quote[] = parsed.selectedIndices
    .filter((idx) => idx >= 0 && idx < state.reviews.length)
    .map((idx, i) => {
      const review = state.reviews[idx]
      return {
        id: `q-${i + 1}`,
        text: review.text,
        author: review.author,
        rating: review.rating,
        sentiment: review.sentiment,
        themeLabel: review.primaryTheme,
      }
    })

  return { quotes }
}

// ── Node 5: buildSummary ──────────────────────────────────────────────────────
async function buildSummary(state: IngestState): Promise<Partial<IngestState>> {
  const model = new ChatOpenAI({
    model: 'gpt-4.1-mini',
    temperature: 0.3,
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await model.invoke([
    { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
    {
      role: 'user',
      content: JSON.stringify({
        reviews: state.reviews.map((r) => ({ sentiment: r.sentiment, primaryTheme: r.primaryTheme, rating: r.rating })),
        themes: state.themes,
      }),
    },
  ])

  const parsed = JSON.parse(response.content as string) as {
    sentimentScore: number
    topPositiveTheme: string
    topNegativeTheme: string
    overview: string
  }

  const summary: AnalysisSummary = {
    sentimentScore: parsed.sentimentScore,
    totalReviews: state.reviews.length, // derived from data, not LLM
    topPositiveTheme: parsed.topPositiveTheme,
    topNegativeTheme: parsed.topNegativeTheme,
    overview: parsed.overview,
  }

  return { summary }
}

// ── Graph assembly ────────────────────────────────────────────────────────────
function buildIngestGraph() {
  return new StateGraph(IngestStateAnnotation)
    .addNode('assignIds', assignIds)
    .addNode('classifyReviews', classifyReviews)
    .addNode('extractThemes', extractThemes)
    .addNode('extractQuotes', extractQuotes)
    .addNode('buildSummary', buildSummary)
    .addEdge(START, 'assignIds')
    .addEdge('assignIds', 'classifyReviews')
    .addEdge('classifyReviews', 'extractThemes')
    .addEdge('classifyReviews', 'extractQuotes')
    .addEdge(['extractThemes', 'extractQuotes'], 'buildSummary')
    .addEdge('buildSummary', END)
    .compile()
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function runIngestGraph(scrapedData: ScrapedData): Promise<AnalysisPayload> {
  const graph = buildIngestGraph()

  const result = await graph.invoke({
    scrapedData,
    reviews: [],
    themes: [],
    quotes: [],
    summary: null,
    error: null,
  })

  if (!result.summary) throw new GraphError('Graph completed without producing a summary')

  // Compute date range from review dates
  const dates = result.reviews.map((r: Review) => r.date).sort()
  const from = dates[0] ?? new Date().toISOString()
  const to = dates[dates.length - 1] ?? new Date().toISOString()

  const slug = scrapedData.companyName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  return {
    source: {
      id: slug,
      url: scrapedData.url,
      platform: scrapedData.platform,
      analyzedAt: new Date().toISOString(),
      reviewCount: result.reviews.length,
      dateRange: { from, to },
    },
    summary: result.summary,
    themes: result.themes,
    quotes: result.quotes,
    reviews: result.reviews,
  }
}
