<objective>
Create a comprehensive backend techspec document for ReviewLens AI. This spec will be the authoritative reference for implementing the full backend: a Node.js + TypeScript Express server with Crawlee-powered Trustpilot scraping, a LangGraph.js AI analysis agent, and SSE-streamed chat responses.

The backend must produce data in the exact shape the frontend Zustand store expects (defined in `src/types/index.ts`) so that once wired up, mock data can be replaced with real API responses with zero frontend changes.
</objective>

<context>
Read `/Users/rodrigosilva/dev/reviewlensai/.claude/CLAUDE.md` carefully. Pay close attention to:
- Backend rules: all routes in `api/`, one file per endpoint; graph logic in `api/graph/`; system prompts in `api/prompts/`; Zod schemas in `api/schemas/`; never hardcode keys; never expose raw errors
- Frontend data contract: read `src/types/index.ts` for the exact TypeScript interfaces the backend must satisfy
- Frontend mock data: read `src/mock/data.ts` to understand the expected data shapes and field values

Tech stack confirmed:
- Runtime: Node.js + TypeScript
- Server: Express (local dev) → Vercel Serverless Functions (production)
- Scraping: Crawlee with PlaywrightCrawler (Trustpilot is Next.js/SSR — requires headless browser)
- AI pipeline: LangGraph.js with stateful graph
- LLM: OpenAI GPT-4o
- Streaming: Server-Sent Events (SSE) for chat responses
- Validation: Zod on all request bodies

Test URL for scraping: https://www.trustpilot.com/review/lendingclub.com
</context>

<trustpilot_selectors>
Trustpilot uses CSS Modules with content-hashed class names that change between deployments. CSS classes MUST NOT be used as selectors. Use only these stable `data-*` attributes and semantic HTML selectors:

| Data to extract | Stable selector | Notes |
|---|---|---|
| Each review card container | `article[data-service-review-card-paper="true"]` | One per review |
| Reviewer name | `span[data-consumer-name-typography="true"]` | Inside each article |
| Review date | `time[data-service-review-date-time-ago="true"]` | Use `datetime` attribute (ISO) |
| Star rating | `img[alt^="Rated"]` | Parse: "Rated 5 out of 5 stars" → 5 |
| Review text | `p[data-relevant-review-text-typography="true"]` | May be truncated client-side |
| Overall score | `p[data-rating-typography="true"]` | e.g. "4.7" |
| Company display name | `h1#business-unit-title span` (first span with display name) | |
| Total review count | Text node in `h1#business-unit-title` | Parse: "Reviews 11,233" → 11233 |

Pagination: Trustpilot reviews are paginated via `?page=N` query param. The scraper must follow pagination until a configurable max page count.
</trustpilot_selectors>

<requirements>
Produce a comprehensive techspec document saved to `./docs/techspec-backend.md`. It must cover all of the following sections:

### 1. Project Structure
Define the complete `api/` folder layout:
```
api/
  ingest.ts           — POST /api/ingest endpoint
  chat.ts             — POST /api/chat endpoint (SSE)
  graph/
    state.ts          — LangGraph state schema (Zod + Annotation)
    ingestGraph.ts    — analysis graph (scrape → classify → summarize)
    chatGraph.ts      — chat graph (classify question → answer or guardrail)
  prompts/
    classify.ts       — system prompt for sentiment/theme classification
    summarize.ts      — system prompt for producing AnalysisPayload summary
    chat.ts           — system prompt for guardrailed Q&A
  schemas/
    ingest.schema.ts  — Zod schema for POST /api/ingest body
    chat.schema.ts    — Zod schema for POST /api/chat body
  scraper/
    trustpilot.ts     — Crawlee PlaywrightCrawler scraper
    selectors.ts      — all CSS/data-* selectors as named constants
  lib/
    openai.ts         — OpenAI client singleton
    errors.ts         — internal error types and safe client error formatter
```

For each file, provide:
- File path
- Single-sentence purpose
- Key exports (function/type names)

### 2. Zod Schemas & Request Contracts

Define the exact Zod schemas for both endpoints:

**POST /api/ingest** — accepts either URL or raw text:
```typescript
// One of url OR text must be present
IngestUrlSchema: { url: string (valid URL) }
IngestTextSchema: { text: string (min 50 chars) }
IngestBodySchema: union of the above
```

**POST /api/chat** — streaming endpoint:
```typescript
ChatBodySchema: {
  question: string (non-empty, max 500 chars),
  reviewIds: string[] (non-empty array)
}
```

### 3. Trustpilot Scraper (`api/scraper/trustpilot.ts`)

Specify the full scraper implementation contract:

- Uses `PlaywrightCrawler` from Crawlee (required because Trustpilot is client-rendered)
- Input: a valid Trustpilot URL
- Output: a `ScrapedData` object containing:
  ```typescript
  interface ScrapedData {
    companyName: string
    platform: 'Trustpilot'
    url: string
    overallScore: number       // 0-5
    totalReviewCount: number
    scrapedAt: string          // ISO timestamp
    reviews: ScrapedReview[]
  }

  interface ScrapedReview {
    author: string
    rating: number             // 1-5 parsed from img[alt^="Rated"]
    dateIso: string            // from time[datetime] attribute
    text: string
  }
  ```
- Pagination: follow `?page=2`, `?page=3`, etc. up to a `MAX_PAGES` env var (default: 5)
- Selector strategy: define all selectors in `api/scraper/selectors.ts` as named constants — never inline strings in the crawler logic
- Error handling: if a page yields 0 reviews (bot detection, redirect, or structure change), throw a descriptive error
- Specify the `selectors.ts` file with the exact selector constants from the HTML analysis above

### 4. LangGraph Ingest Graph (`api/graph/ingestGraph.ts`)

Begin this section with a **Design Rationale** subsection that explains to future developers why LangGraph was chosen over a simpler approach. Include the following points and present them as a comparison table:

**Design Rationale: Why LangGraph instead of a single LLM call?**

A single structured LLM call (sending all reviews at once and asking for classifications, themes, quotes, and summary in one prompt) is simpler and works fine for small datasets. However, ReviewLens is designed to handle Trustpilot pages with 100–500+ reviews (5 pages × up to 100 reviews/page). This makes scalability a primary concern, not an afterthought.

Include this comparison table in the document:

| Consideration | LangGraph (multi-node) | Single LLM call |
|---|---|---|
| Scales to 100+ reviews | Yes — `classifyReviews` batches in chunks of 20 | No — token limit exceeded |
| Prompt accuracy | Higher — each node has one focused task | Lower — one mega-prompt doing everything |
| Failure recovery | Per-node retry without restarting the pipeline | All-or-nothing |
| Matches chat graph patterns | Yes — consistent framework across both graphs | No |
| POC complexity | Higher | Lower |

**Conclusion to include**: The pipeline is linear (no branching in the ingest graph), so the core LangGraph value of conditional edges does not apply here. The choice is justified entirely by batching at scale and per-node fault isolation. The chat graph, by contrast, requires LangGraph for its guardrail conditional edge.

Specify the stateful AI graph that processes scraped data into an `AnalysisPayload`:

**State shape** (define in `api/graph/state.ts` using LangGraph `Annotation`):
```typescript
{
  scrapedData: ScrapedData | null
  reviews: Review[]             // typed reviews with IDs assigned
  themes: Theme[]               // extracted themes
  quotes: Quote[]               // selected key quotes
  summary: AnalysisSummary | null
  error: string | null
}
```

**Graph nodes** (define each node's input, output, and LLM call):
1. `assignIds` — pure node, no LLM: assigns stable `id` fields to each scraped review, maps `ScrapedReview[]` → `Review[]`
2. `classifyReviews` — LLM node: for each review, classify `sentiment` (positive/neutral/negative) and `primaryTheme` (string label). Uses `api/prompts/classify.ts`. Batch in chunks of 20 to avoid token limits.
3. `extractThemes` — LLM node: aggregate classified reviews → produce `Theme[]` with `percentage`, `reviewCount`, `sentiment`. Uses `api/prompts/summarize.ts`.
4. `extractQuotes` — LLM node: select 4 most representative quotes → `Quote[]`. Uses `api/prompts/summarize.ts`.
5. `buildSummary` — LLM node: produce `AnalysisSummary` (sentimentScore, topPositiveTheme, topNegativeTheme, overview). Uses `api/prompts/summarize.ts`.

**Graph edges**: linear — `assignIds → classifyReviews → extractThemes → extractQuotes → buildSummary → END`

**Output**: the final graph state maps directly to `AnalysisPayload` (matching `src/types/index.ts`)

### 5. LangGraph Chat Graph (`api/graph/chatGraph.ts`)

Specify the guardrailed chat graph:

**State shape**:
```typescript
{
  question: string
  reviewTexts: string[]       // passed in from frontend (reviews for context)
  isGuardrailed: boolean
  answer: string
}
```

**Graph nodes**:
1. `classifyQuestion` — LLM node with `api/prompts/chat.ts`: determines if the question is answerable from the reviews. Sets `isGuardrailed = true` if out of scope.
2. `answerQuestion` — LLM node: answers the question strictly from review context. Called only if not guardrailed.
3. `guardrailResponse` — pure node: sets a fixed guardrail message if `isGuardrailed = true`.

**Conditional edge**: after `classifyQuestion` → if `isGuardrailed` → `guardrailResponse` → END, else → `answerQuestion` → END

### 6. System Prompts

Specify the content and purpose of each prompt file:

**`api/prompts/classify.ts`** — Review classification:
- Input context: raw review text, author, rating
- Required output format: strict JSON `{ sentiment: "positive"|"neutral"|"negative", primaryTheme: string }`
- Constraint: theme label must be 1-3 words, title case
- Why strict JSON: LangGraph nodes parse the output programmatically

**`api/prompts/summarize.ts`** — Analysis summarization:
- Used for both theme extraction and summary building
- Receives: full list of classified reviews as JSON
- Required output: depends on calling node (themes list vs summary object)
- Specify the exact output shape for each use

**`api/prompts/chat.ts`** — Guardrailed Q&A:
- Persona: "You are an analyst assistant. You ONLY answer questions based on the reviews provided to you. If a question cannot be answered from the reviews, you must decline."
- Guardrail trigger examples: questions about price predictions, personal advice, anything not in the reviews
- Output format for guardrail: a specific decline message (define it)

### 7. API Routes

**`api/ingest.ts` — POST /api/ingest**:
- Validate body with `IngestBodySchema` (fail fast with 400 + clear message)
- Branch: if `url` → call scraper → run ingest graph; if `text` → parse text directly → run ingest graph
- On success: return `AnalysisPayload` as JSON (200)
- On error: log internally, return `{ message: string }` (500) — never expose stack traces
- Estimated response time note: scraping + AI graph can take 15-30s — frontend should show a loading state

**`api/chat.ts` — POST /api/chat (SSE)**:
- Validate body with `ChatBodySchema`
- Set SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Stream LLM tokens using OpenAI streaming + LangGraph: write each token chunk as `data: <token>\n\n`
- On completion: write `data: [DONE]\n\n` and close the connection
- On guardrail: stream the guardrail message the same way (no special protocol — frontend reads content)
- On error: write `data: [ERROR]\n\n` and close

### 8. Environment Variables

Define all required env vars and their purpose:
```
OPENAI_API_KEY       — OpenAI API key for GPT-4o calls
MAX_SCRAPE_PAGES     — Max Trustpilot pages to scrape (default: 5)
NODE_ENV             — "development" | "production"
```
Specify that all env access must go through `process.env` with a validation check at startup.

### 9. Frontend Integration Notes

Explain the two changes needed on the frontend once the backend is live:
1. In `src/features/ingest/hooks/useIngest.ts`: replace `mockAnalysisPayload` with `api.ingestUrl(url)` or `api.ingestText(text)` (already stubbed in `src/lib/api.ts`)
2. In `src/features/chat/hooks/useChat.ts`: replace `api.chat()` stub with real SSE fetch using `EventSource` or `fetch` with `ReadableStream` — specify which approach and why

### 10. Development Setup

Specify:
- How to run the backend locally (Express dev server, separate from Vite frontend)
- Package.json scripts needed in a new `package.json` under `api/` or the root
- Key npm packages to install: `express`, `@langchain/langgraph`, `@langchain/openai`, `crawlee`, `playwright`, `zod`
- tsconfig for the `api/` folder
- How Vercel serverless deployment works (each file in `api/` becomes a function automatically)

### 11. TODO List

Add a numbered task list at the end of the document. Each item must be one line: a number and a short summary only. Tasks must follow implementation order.

```
1.  Set up api/ folder structure + tsconfig
2.  Install backend dependencies
3.  Define Zod schemas (ingest + chat)
4.  Write selector constants (api/scraper/selectors.ts)
5.  Implement Trustpilot scraper with pagination
6.  Write system prompts (classify, summarize, chat)
7.  Define LangGraph state schema
8.  Implement ingest graph (5 nodes)
9.  Implement chat graph with guardrail edge
10. Implement POST /api/ingest route
11. Implement POST /api/chat SSE route
12. Wire frontend useIngest to real API
13. Wire frontend useChat to SSE stream
14. End-to-end test with lendingclub.com URL
```
</requirements>

<constraints>
- This is a planning document, not implementation. Do NOT write TypeScript/JavaScript code beyond interface definitions and configuration examples.
- Every node in every LangGraph graph must have clearly defined input state, output state, and LLM prompt reference.
- All selector references in the scraper section must use only `data-*` attributes and semantic HTML — no CSS class names.
- The output shape of the ingest pipeline must exactly match `AnalysisPayload` from `src/types/index.ts` — verify this in the spec.
- SSE streaming must be specified at the protocol level: what headers are set, what each event looks like, how the frontend consumes it.
- Never spec raw error exposure — every error path must have a sanitized client message.
</constraints>

<output>
Save the complete techspec as: `./docs/techspec-backend.md`

Use clear markdown headings for each of the 10 sections. Use tables for selectors and env vars, code blocks for interfaces and schema definitions, and flow diagrams (ASCII) for the LangGraph graph edges.

The document must be thorough enough that a developer can begin implementation of the full backend without asking clarifying questions.
</output>

<verification>
Before saving, verify:
- All 11 sections are present and complete
- Scraper section uses only stable `data-*` and semantic selectors (no CSS classes)
- LangGraph graph nodes have clear input/output state for each node
- SSE streaming protocol is fully specified (headers + event format + done signal)
- Output shape from ingest graph matches `AnalysisPayload` from frontend types
- All error paths return sanitized messages
- Environment variable list is complete
</verification>

<success_criteria>
- `./docs/techspec-backend.md` exists and covers all 11 sections
- A developer can implement the backend end-to-end using only this document and the frontend source files
- The data contract between backend and frontend is explicitly verified in the spec
- No implementation code included — specs, interfaces, and structural decisions only
</success_criteria>
