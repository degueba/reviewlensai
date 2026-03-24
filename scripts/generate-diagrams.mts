/**
 * Generates PNG diagrams for the ingest and chat LangGraph pipelines.
 * Uses LangGraph's built-in drawMermaidPng() — no extra tools needed.
 *
 * Run: npx tsx scripts/generate-diagrams.mts
 * Output: docs/ingest-graph.png, docs/chat-graph.png
 */

import { writeFile } from 'fs/promises'
import { StateGraph, START, END } from '@langchain/langgraph'
import { IngestStateAnnotation, ChatStateAnnotation } from '../api/graph/state.js'

const noop = () => ({})

// ── Ingest graph topology ──────────────────────────────────────────────────
const ingestGraph = new StateGraph(IngestStateAnnotation)
  .addNode('assignIds',       noop)
  .addNode('classifyReviews', noop)
  .addNode('extractThemes',   noop)
  .addNode('extractQuotes',   noop)
  .addNode('buildSummary',    noop)
  .addEdge(START,               'assignIds')
  .addEdge('assignIds',         'classifyReviews')
  .addEdge('classifyReviews',   'extractThemes')
  .addEdge('classifyReviews',   'extractQuotes')
  .addEdge(['extractThemes', 'extractQuotes'], 'buildSummary')
  .addEdge('buildSummary',      END)
  .compile()

// ── Chat graph topology ────────────────────────────────────────────────────
const chatGraph = new StateGraph(ChatStateAnnotation)
  .addNode('classifyQuestion',  noop)
  .addNode('answerQuestion',    noop)
  .addNode('guardrailResponse', noop)
  .addEdge(START, 'classifyQuestion')
  .addConditionalEdges('classifyQuestion', noop, {
    answerQuestion:    'answerQuestion',
    guardrailResponse: 'guardrailResponse',
  })
  .addEdge('answerQuestion',    END)
  .addEdge('guardrailResponse', END)
  .compile()

// ── Render & save ──────────────────────────────────────────────────────────
async function savePng(graph: ReturnType<typeof ingestGraph.getGraph>, path: string) {
  const blob = await graph.drawMermaidPng()
  await writeFile(path, Buffer.from(await blob.arrayBuffer()))
  console.log(`✅  ${path}`)
}

await savePng(ingestGraph.getGraph(), 'docs/ingest-graph.png')
await savePng(chatGraph.getGraph(),   'docs/chat-graph.png')
