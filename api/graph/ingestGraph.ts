import { StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { IngestStateAnnotation, type IngestState } from './state.js'
import { CLASSIFY_SYSTEM_PROMPT } from '../prompts/classify.js'
import { THEMES_SYSTEM_PROMPT, QUOTES_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from '../prompts/summarize.js'
import type { Review, Theme, Quote, AnalysisSummary, AnalysisPayload } from '../types.js'
import type { ScrapedData } from '../scraper/trustpilot.js'
import { GraphError } from '../lib/errors.js'

const CLASSIFY_BATCH_SIZE = 20

// ── Node 1: assignIds ─────────────────────────────────────────────────────────
function assignIds(state: IngestState): Partial<IngestState> {
  const { scrapedData } = state
  if (!scrapedData) throw new GraphError('assignIds: scrapedData is null')

  const reviews: Review[] = scrapedData.reviews.map((r, i) => ({
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
    model: 'gpt-4o',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  })

  const reviews = [...state.reviews]
  const batches: Review[][] = []
  for (let i = 0; i < reviews.length; i += CLASSIFY_BATCH_SIZE) {
    batches.push(reviews.slice(i, i + CLASSIFY_BATCH_SIZE))
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b]
    const batchStart = b * CLASSIFY_BATCH_SIZE

    const input = batch.map((r) => ({ text: r.text, author: r.author, rating: r.rating }))
    const response = await model.invoke([
      { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(input) },
    ])

    const parsed = JSON.parse(response.content as string) as {
      classifications: Array<{ sentiment: 'positive' | 'neutral' | 'negative'; primaryTheme: string }>
    }

    parsed.classifications.forEach((c, idx) => {
      reviews[batchStart + idx].sentiment = c.sentiment
      reviews[batchStart + idx].primaryTheme = c.primaryTheme
    })
  }

  return { reviews }
}

// ── Node 3: extractThemes ─────────────────────────────────────────────────────
async function extractThemes(state: IngestState): Promise<Partial<IngestState>> {
  const model = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await model.invoke([
    { role: 'system', content: THEMES_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(state.reviews) },
  ])

  const parsed = JSON.parse(response.content as string) as {
    themes: Array<{ label: string; reviewCount: number; percentage: number; sentiment: 'positive' | 'neutral' | 'negative' }>
  }

  const themes: Theme[] = parsed.themes.map((t, i) => ({
    id: `th-${i + 1}`,
    label: t.label,
    sentiment: t.sentiment,
    reviewCount: t.reviewCount,
    percentage: t.percentage,
  }))

  return { themes }
}

// ── Node 4: extractQuotes ─────────────────────────────────────────────────────
async function extractQuotes(state: IngestState): Promise<Partial<IngestState>> {
  const model = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0.2,
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await model.invoke([
    { role: 'system', content: QUOTES_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(state.reviews) },
  ])

  const parsed = JSON.parse(response.content as string) as { selectedIndices: number[] }

  const quotes: Quote[] = parsed.selectedIndices.map((idx, i) => {
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
    model: 'gpt-4o',
    temperature: 0.3,
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await model.invoke([
    { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
    {
      role: 'user',
      content: JSON.stringify({ reviews: state.reviews, themes: state.themes }),
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
    .addEdge('extractThemes', 'extractQuotes')
    .addEdge('extractQuotes', 'buildSummary')
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
