# ReviewLens AI — Backend Technical Specification

**Status**: Planning
**Author**: Claude Code
**Date**: 2026-03-23
**Target stack**: Node.js + TypeScript, Express (local) / Vercel Serverless (production), Crawlee, LangGraph.js, OpenAI GPT-4o, Zod

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Zod Schemas & Request Contracts](#2-zod-schemas--request-contracts)
3. [Trustpilot Scraper](#3-trustpilot-scraper)
4. [LangGraph Ingest Graph](#4-langgraph-ingest-graph)
5. [LangGraph Chat Graph](#5-langgraph-chat-graph)
6. [System Prompts](#6-system-prompts)
7. [API Routes](#7-api-routes)
8. [Environment Variables](#8-environment-variables)
9. [Frontend Integration Notes](#9-frontend-integration-notes)
10. [Development Setup](#10-development-setup)
11. [TODO List](#11-todo-list)

---

## 1. Project Structure

The entire backend lives under `api/` at the repository root. In Vercel Serverless mode, every `.ts` file directly inside `api/` automatically becomes a function endpoint at the corresponding path (e.g., `api/ingest.ts` → `POST /api/ingest`). Subdirectories (`graph/`, `prompts/`, `schemas/`, `scraper/`, `lib/`) are shared modules, not separate endpoints.

```
api/
├── ingest.ts
├── chat.ts
├── graph/
│   ├── state.ts
│   ├── ingestGraph.ts
│   └── chatGraph.ts
├── prompts/
│   ├── classify.ts
│   ├── summarize.ts
│   └── chat.ts
├── schemas/
│   ├── ingest.schema.ts
│   └── chat.schema.ts
├── scraper/
│   ├── trustpilot.ts
│   └── selectors.ts
└── lib/
    ├── openai.ts
    └── errors.ts
```

### File Inventory

| File | Purpose | Key exports |
|---|---|---|
| `api/ingest.ts` | Express/Vercel handler for `POST /api/ingest`; validates input, branches on URL vs text, returns `AnalysisPayload` | `default` (handler function) |
| `api/chat.ts` | Express/Vercel handler for `POST /api/chat`; validates input, sets SSE headers, streams LLM tokens | `default` (handler function) |
| `api/graph/state.ts` | Defines all LangGraph `Annotation` state schemas for both graphs | `IngestStateAnnotation`, `ChatStateAnnotation` |
| `api/graph/ingestGraph.ts` | Assembles and compiles the five-node ingest analysis graph | `runIngestGraph` |
| `api/graph/chatGraph.ts` | Assembles and compiles the three-node guardrailed chat graph | `runChatGraph` |
| `api/prompts/classify.ts` | System prompt template for per-review sentiment and theme classification | `CLASSIFY_SYSTEM_PROMPT` |
| `api/prompts/summarize.ts` | System prompt templates for theme extraction, quote selection, and summary building | `THEMES_SYSTEM_PROMPT`, `QUOTES_SYSTEM_PROMPT`, `SUMMARY_SYSTEM_PROMPT` |
| `api/prompts/chat.ts` | System prompt for the guardrailed Q&A assistant | `CHAT_SYSTEM_PROMPT` |
| `api/schemas/ingest.schema.ts` | Zod schemas for `POST /api/ingest` request body | `IngestUrlSchema`, `IngestTextSchema`, `IngestBodySchema` |
| `api/schemas/chat.schema.ts` | Zod schemas for `POST /api/chat` request body | `ChatBodySchema` |
| `api/scraper/trustpilot.ts` | Crawlee `PlaywrightCrawler` scraper; accepts a Trustpilot URL and returns `ScrapedData` | `scrapeTrustpilot` |
| `api/scraper/selectors.ts` | All stable `data-*` and semantic HTML selector constants; never inline selectors elsewhere | `SELECTORS` (object of named constants) |
| `api/lib/openai.ts` | Singleton OpenAI client configured from `process.env.OPENAI_API_KEY` | `openai` |
| `api/lib/errors.ts` | Internal error class definitions and a `toClientError` formatter that strips stack traces | `AppError`, `ScraperError`, `GraphError`, `toClientError` |

---

## 2. Zod Schemas & Request Contracts

All schemas live in `api/schemas/`. Route handlers import and call `.safeParse()` on every incoming request body before any other processing. On parse failure, the route returns HTTP 400 with the Zod error message — no further processing occurs.

### `api/schemas/ingest.schema.ts`

The ingest endpoint accepts either a URL (for scraping) or raw text (for direct analysis). Exactly one of the two must be present — they are mutually exclusive via a discriminated union.

```typescript
// Accepts a valid Trustpilot (or any) URL
IngestUrlSchema: z.object({
  url: z.string().url({ message: 'Must be a valid URL' }),
})

// Accepts pasted review text; minimum 50 characters ensures meaningful content
IngestTextSchema: z.object({
  text: z.string().min(50, { message: 'Text must be at least 50 characters' }),
})

// Union: request body must match exactly one of the two shapes
IngestBodySchema: z.union([IngestUrlSchema, IngestTextSchema])
```

**Discriminating at runtime**: After parsing with `IngestBodySchema`, check `'url' in body` to branch between the scraping path and the direct-text path.

### `api/schemas/chat.schema.ts`

```typescript
ChatBodySchema: z.object({
  question: z
    .string()
    .min(1, { message: 'Question cannot be empty' })
    .max(500, { message: 'Question must be 500 characters or fewer' }),
  reviewIds: z
    .array(z.string())
    .min(1, { message: 'At least one reviewId is required' }),
})
```

**Note on `reviewIds`**: The frontend passes `reviews.map(r => r.id)` from the Zustand store. The backend uses these IDs to look up the corresponding review texts from the store or from a cache. For the MVP, the full review text array is reconstructed server-side by re-deriving context from the analysis session. See Section 7 for the exact lookup strategy.

---

## 3. Trustpilot Scraper

### File: `api/scraper/selectors.ts`

All selectors are defined as named string constants in a single exported `SELECTORS` object. The scraper imports from this file exclusively — no selector strings appear inline in `trustpilot.ts`.

```typescript
export const SELECTORS = {
  // Review cards — one article element per review
  REVIEW_CARD: 'article[data-service-review-card-paper="true"]',

  // Inside each review card
  REVIEWER_NAME: 'span[data-consumer-name-typography="true"]',
  REVIEW_DATE:   'time[data-service-review-date-time-ago="true"]',
  STAR_RATING:   'img[alt^="Rated"]',
  REVIEW_TEXT:   'p[data-relevant-review-text-typography="true"]',

  // Page-level metadata (outside review cards)
  OVERALL_SCORE:    'p[data-rating-typography="true"]',
  COMPANY_TITLE:    'h1#business-unit-title',
  COMPANY_NAME_SPAN:'h1#business-unit-title span',
} as const
```

**Star rating parsing rule**: The `alt` attribute of the rating image contains text in the form `"Rated 5 out of 5 stars"`. Extract the first integer by splitting on spaces and parsing `parts[1]` as a number.

**Total review count parsing rule**: The `h1#business-unit-title` element contains a text node like `"Reviews 11,233"`. Strip the word "Reviews", remove commas, and parse as an integer.

### File: `api/scraper/trustpilot.ts`

#### Output Types

```typescript
interface ScrapedReview {
  author: string       // text content of REVIEWER_NAME selector
  rating: number       // 1–5, parsed from img[alt^="Rated"]
  dateIso: string      // value of time[datetime] attribute (ISO 8601)
  text: string         // text content of REVIEW_TEXT selector
}

interface ScrapedData {
  companyName: string        // first span inside h1#business-unit-title
  platform: 'Trustpilot'    // hardcoded literal — only Trustpilot is supported
  url: string                // the canonical base URL that was scraped
  overallScore: number       // 0–5 float, parsed from OVERALL_SCORE selector
  totalReviewCount: number   // parsed from h1#business-unit-title text node
  scrapedAt: string          // new Date().toISOString() at scrape completion
  reviews: ScrapedReview[]
}
```

#### Function signature

```typescript
async function scrapeTrustpilot(url: string): Promise<ScrapedData>
```

#### Implementation Contract

1. **Validate input URL**: confirm it contains `trustpilot.com/review/` before launching the crawler. Throw `ScraperError` otherwise.

2. **Determine max pages**: read `parseInt(process.env.MAX_SCRAPE_PAGES ?? '5', 10)`. Clamp to a minimum of 1.

3. **Seed URL list**: build an array of page URLs:
   ```
   [
     https://www.trustpilot.com/review/{slug}?page=1,
     https://www.trustpilot.com/review/{slug}?page=2,
     ...up to MAX_SCRAPE_PAGES
   ]
   ```
   Pass all page URLs as the initial request queue. Crawlee will process them in parallel (configurable `maxConcurrency`).

4. **Use `PlaywrightCrawler`**: Trustpilot is a Next.js application that renders review content client-side. A headless browser is required. `CheerioCrawler` will not work — it receives only the server-rendered HTML shell before hydration completes.

5. **Per-page extraction** (inside the `requestHandler` callback):
   - Wait for `SELECTORS.REVIEW_CARD` to be present in the DOM before extracting.
   - Query all review card elements.
   - If zero review cards are found on a page that is not a 404, throw `ScraperError` with message `"No review cards found on page — possible bot detection or page structure change"`.
   - For each card, extract all four fields using the selector constants. If `REVIEW_TEXT` is absent or empty, use an empty string (some reviews are rating-only).
   - Collect results into a shared array (use a closure or dataset).

6. **Page-level metadata**: extract `companyName`, `overallScore`, and `totalReviewCount` from the first page only (page 1). These fields are the same on every page.

7. **Assemble and return** `ScrapedData` after all pages have been processed.

#### Error Handling

| Scenario | Behavior |
|---|---|
| URL does not contain `trustpilot.com/review/` | Throw `ScraperError('Invalid Trustpilot URL')` |
| Zero review cards on a loaded page | Throw `ScraperError('No review cards found — possible bot detection')` |
| Network timeout or navigation error | Crawlee will retry per its default retry policy; after max retries, the error propagates to the route handler |
| Missing metadata fields (name / score) | Throw `ScraperError('Could not extract company metadata from page 1')` |

---

## 4. LangGraph Ingest Graph

### Design Rationale: Why LangGraph Instead of a Single LLM Call?

A single structured LLM call — sending all reviews at once and asking for classifications, themes, quotes, and a summary in one prompt — is simpler and works fine for small datasets. However, ReviewLens is designed to handle Trustpilot pages with 100–500+ reviews (5 pages × up to 100 reviews per page). Scalability is a primary design constraint, not an afterthought.

| Consideration | LangGraph (multi-node) | Single LLM call |
|---|---|---|
| Scales to 100+ reviews | Yes — `classifyReviews` batches in chunks of 20 | No — token limit exceeded |
| Prompt accuracy | Higher — each node has one focused task | Lower — one mega-prompt doing everything |
| Failure recovery | Per-node retry without restarting the pipeline | All-or-nothing |
| Matches chat graph patterns | Yes — consistent framework across both graphs | No |
| POC complexity | Higher | Lower |

**Conclusion**: The ingest pipeline is linear (no branching), so the conditional edge capability of LangGraph does not apply here. The choice is justified entirely by batching at scale and per-node fault isolation. The chat graph, by contrast, requires LangGraph specifically for its guardrail conditional edge. Using LangGraph for both graphs keeps the codebase consistent and reduces the framework surface area.

---

### State Schema: `api/graph/state.ts`

The state file defines both the ingest and chat state annotations using LangGraph's `Annotation` primitive. Zod types are defined alongside for validation.

#### Ingest State

```typescript
// Zod type definitions (for documentation and external validation)
IngestStateSchema: z.object({
  scrapedData: ScrapedDataSchema.nullable(),
  reviews: z.array(ReviewSchema),        // Review[] from src/types/index.ts
  themes: z.array(ThemeSchema),          // Theme[] from src/types/index.ts
  quotes: z.array(QuoteSchema),          // Quote[] from src/types/index.ts
  summary: AnalysisSummarySchema.nullable(),
  error: z.string().nullable(),
})

// LangGraph Annotation (the runtime state container)
IngestStateAnnotation: Annotation.Root({
  scrapedData: Annotation<ScrapedData | null>,
  reviews: Annotation<Review[]>,
  themes: Annotation<Theme[]>,
  quotes: Annotation<Quote[]>,
  summary: Annotation<AnalysisSummary | null>,
  error: Annotation<string | null>,
})
```

#### Chat State

```typescript
ChatStateAnnotation: Annotation.Root({
  question: Annotation<string>,
  reviewTexts: Annotation<string[]>,
  isGuardrailed: Annotation<boolean>,
  answer: Annotation<string>,
})
```

---

### Graph: `api/graph/ingestGraph.ts`

#### Exported function

```typescript
async function runIngestGraph(scrapedData: ScrapedData): Promise<AnalysisPayload>
```

The function compiles the graph once (outside the handler, at module load time) and invokes it with the provided scraped data. It returns an `AnalysisPayload` object that exactly satisfies the frontend's type contract.

#### Graph Flow (ASCII)

```
START
  │
  ▼
assignIds          (pure — no LLM)
  │
  ▼
classifyReviews    (LLM — batched, uses classify.ts prompt)
  │
  ▼
extractThemes      (LLM — uses summarize.ts THEMES prompt)
  │
  ▼
extractQuotes      (LLM — uses summarize.ts QUOTES prompt)
  │
  ▼
buildSummary       (LLM — uses summarize.ts SUMMARY prompt)
  │
  ▼
END
```

All edges are unconditional. No branching occurs in the ingest graph.

---

#### Node Specifications

##### Node 1: `assignIds`

**Type**: Pure function (no LLM call)

**Input state fields**:
- `scrapedData: ScrapedData` — the raw output of the scraper

**Processing**:
- Map each `ScrapedReview` to a `Review` by:
  - Assigning a stable `id` using the pattern `r-{index+1}` (e.g., `r-1`, `r-2`)
  - Mapping `dateIso` → `date`
  - Setting `sentiment` to `'neutral'` as a placeholder (will be overwritten by `classifyReviews`)
  - Setting `primaryTheme` to `''` as a placeholder
- Also extracts and stores metadata needed for the `ReviewSource` object (used later when building the final `AnalysisPayload`)

**Output state fields**:
- `reviews: Review[]` — populated array with IDs assigned, sentiment and theme placeholder values

---

##### Node 2: `classifyReviews`

**Type**: LLM node

**Input state fields**:
- `reviews: Review[]` — reviews with placeholder sentiment/theme from `assignIds`

**Processing**:
- Split `reviews` into chunks of 20 (configurable constant `CLASSIFY_BATCH_SIZE = 20`)
- For each chunk, call GPT-4o with `CLASSIFY_SYSTEM_PROMPT` (from `api/prompts/classify.ts`)
- Pass each review's `text`, `author`, and `rating` to the prompt
- Parse the JSON response to extract `sentiment` and `primaryTheme` for each review in the chunk
- Merge classifications back into the `reviews` array by index

**LLM call parameters**:
- Model: `gpt-4o`
- Response format: `json_object` (enforced via OpenAI `response_format`)
- Temperature: 0 (deterministic classification)

**Output state fields**:
- `reviews: Review[]` — all entries now have `sentiment` and `primaryTheme` populated

---

##### Node 3: `extractThemes`

**Type**: LLM node

**Input state fields**:
- `reviews: Review[]` — fully classified reviews

**Processing**:
- Pass the full `reviews` array (serialized as JSON) to GPT-4o with `THEMES_SYSTEM_PROMPT`
- The LLM aggregates `primaryTheme` labels across all reviews, groups them, computes `reviewCount` and `percentage`, and assigns a dominant `sentiment` to each theme
- Parse the response to produce `Theme[]`
- Assign stable IDs using pattern `th-{index+1}`

**LLM call parameters**:
- Model: `gpt-4o`
- Response format: `json_object`
- Temperature: 0

**Output state fields**:
- `themes: Theme[]` — array matching the `Theme` interface from `src/types/index.ts`

---

##### Node 4: `extractQuotes`

**Type**: LLM node

**Input state fields**:
- `reviews: Review[]` — fully classified reviews

**Processing**:
- Pass the full `reviews` array to GPT-4o with `QUOTES_SYSTEM_PROMPT`
- The LLM selects exactly 4 reviews that best represent the range of sentiment and themes
- Construct `Quote[]` from the selected reviews: use `review.text`, `review.author`, `review.rating`, `review.sentiment`, and `review.primaryTheme` as `themeLabel`
- Assign stable IDs using pattern `q-{index+1}`

**LLM call parameters**:
- Model: `gpt-4o`
- Response format: `json_object`
- Temperature: 0.2 (slight variation to allow better representative selection)

**Output state fields**:
- `quotes: Quote[]` — array of exactly 4 quotes matching the `Quote` interface from `src/types/index.ts`

---

##### Node 5: `buildSummary`

**Type**: LLM node

**Input state fields**:
- `reviews: Review[]` — fully classified reviews
- `themes: Theme[]` — extracted themes

**Processing**:
- Pass both arrays to GPT-4o with `SUMMARY_SYSTEM_PROMPT`
- The LLM produces:
  - `sentimentScore`: a float between 0 and 10 representing overall sentiment (0 = entirely negative, 10 = entirely positive)
  - `totalReviews`: integer count (derived directly from `reviews.length`, not from LLM)
  - `topPositiveTheme`: label of the theme with highest `reviewCount` and `sentiment === 'positive'`
  - `topNegativeTheme`: label of the theme with highest `reviewCount` and `sentiment === 'negative'`
  - `overview`: a 2-4 sentence plain-language summary of the overall sentiment and key themes

**LLM call parameters**:
- Model: `gpt-4o`
- Response format: `json_object`
- Temperature: 0.3 (some fluency variation in the overview text is desirable)

**Output state fields**:
- `summary: AnalysisSummary` — matches the `AnalysisSummary` interface from `src/types/index.ts`

---

#### Output → `AnalysisPayload` Mapping

After the graph reaches `END`, `runIngestGraph` assembles the final `AnalysisPayload` from the terminal state. The mapping is explicit and deterministic:

```
graph state field        → AnalysisPayload field
─────────────────────────────────────────────────────────────────────
scrapedData.url          → source.url
scrapedData.platform     → source.platform         ('Trustpilot')
scrapedData.companyName  → source.id               (slugified for id)
new Date().toISOString() → source.analyzedAt
reviews.length           → source.reviewCount
reviews[0].date          → source.dateRange.from   (min date)
reviews[last].date       → source.dateRange.to     (max date)
─────────────────────────────────────────────────────────────────────
summary                  → summary                 (direct pass-through)
themes                   → themes                  (direct pass-through)
quotes                   → quotes                  (direct pass-through)
reviews                  → reviews                 (direct pass-through)
```

**Important**: `source.dateRange.from` and `source.dateRange.to` are computed by sorting all `review.date` values and taking the min and max, not by using the scraper's `scrapedAt` timestamp.

**Verification against `src/types/index.ts`**:

| `AnalysisPayload` field | Type in `src/types/index.ts` | Satisfied by graph output |
|---|---|---|
| `source.id` | `string` | Slugified company name, e.g. `"lendingclub-com"` |
| `source.url` | `string \| null` | `scrapedData.url` (string for URL ingestion, `null` for text ingestion) |
| `source.platform` | `string` | `'Trustpilot'` literal |
| `source.analyzedAt` | `string` | ISO timestamp at graph completion |
| `source.reviewCount` | `number` | `reviews.length` |
| `source.dateRange.from` | `string` | Earliest `review.date` |
| `source.dateRange.to` | `string` | Latest `review.date` |
| `summary.sentimentScore` | `number` | LLM-produced float 0–10 |
| `summary.totalReviews` | `number` | `reviews.length` |
| `summary.topPositiveTheme` | `string` | LLM-produced label |
| `summary.topNegativeTheme` | `string` | LLM-produced label |
| `summary.overview` | `string` | LLM-produced narrative |
| `themes[n].id` | `string` | `th-{n+1}` |
| `themes[n].label` | `string` | 1–3 word title-case string |
| `themes[n].sentiment` | `SentimentLabel` | `'positive' \| 'neutral' \| 'negative'` |
| `themes[n].reviewCount` | `number` | Count of reviews with that theme |
| `themes[n].percentage` | `number` | `(reviewCount / totalReviews) * 100` |
| `quotes[n].id` | `string` | `q-{n+1}` |
| `quotes[n].text` | `string` | Review text content |
| `quotes[n].author` | `string` | Review author name |
| `quotes[n].rating` | `number` | 1–5 |
| `quotes[n].sentiment` | `SentimentLabel` | Classified sentiment |
| `quotes[n].themeLabel` | `string` | `review.primaryTheme` |
| `reviews[n].id` | `string` | `r-{n+1}` |
| `reviews[n].author` | `string` | From scraper |
| `reviews[n].rating` | `number` | 1–5 from scraper |
| `reviews[n].date` | `string` | ISO date string from scraper |
| `reviews[n].text` | `string` | From scraper |
| `reviews[n].sentiment` | `SentimentLabel` | From `classifyReviews` node |
| `reviews[n].primaryTheme` | `string` | From `classifyReviews` node |

All 27 fields of `AnalysisPayload` are accounted for. No frontend changes are required to consume this response.

---

## 5. LangGraph Chat Graph

### File: `api/graph/chatGraph.ts`

#### Exported function

```typescript
async function runChatGraph(
  question: string,
  reviewTexts: string[]
): Promise<{ answer: string; isGuardrailed: boolean }>
```

#### Graph Flow (ASCII)

```
START
  │
  ▼
classifyQuestion   (LLM — determines if question is in scope)
  │
  ├─── isGuardrailed === true ───▶ guardrailResponse ───▶ END
  │
  └─── isGuardrailed === false ──▶ answerQuestion ────────▶ END
```

The conditional edge after `classifyQuestion` is the primary reason LangGraph is used for the chat pipeline. Without a conditional edge, a simpler sequential chain would suffice.

---

#### Node Specifications

##### Node 1: `classifyQuestion`

**Type**: LLM node

**Input state fields**:
- `question: string` — the user's raw question
- `reviewTexts: string[]` — the full text of all ingested reviews (for context)

**Processing**:
- Call GPT-4o with `CHAT_SYSTEM_PROMPT` (from `api/prompts/chat.ts`)
- Provide the question and a brief description of the available review data
- The LLM determines whether the question is answerable from the reviews
- Returns `{ answerable: boolean }` as strict JSON
- Map `answerable === false` → `isGuardrailed = true`

**LLM call parameters**:
- Model: `gpt-4o`
- Response format: `json_object`
- Temperature: 0

**Output state fields**:
- `isGuardrailed: boolean`

---

##### Node 2: `answerQuestion`

**Type**: LLM node (called only if `isGuardrailed === false`)

**Input state fields**:
- `question: string`
- `reviewTexts: string[]`

**Processing**:
- Call GPT-4o with `CHAT_SYSTEM_PROMPT`, passing the full review text corpus as context
- Instruct the LLM to answer the question strictly from the provided reviews
- The response is a plain-text answer (no JSON enforcement — streaming-friendly)

**LLM call parameters**:
- Model: `gpt-4o`
- Temperature: 0.4 (some fluency is desirable for natural answers)
- Streaming: enabled via OpenAI streaming API

**Output state fields**:
- `answer: string` — the streamed response accumulated into a single string

---

##### Node 3: `guardrailResponse`

**Type**: Pure function (no LLM call)

**Input state fields**:
- `isGuardrailed: boolean` (must be `true` to reach this node)

**Processing**:
- Set `answer` to the fixed guardrail decline message:
  > `"I can only answer questions based on the reviews you've loaded. This question falls outside that scope. Please ask something related to the review content."`

**Output state fields**:
- `answer: string` — the fixed decline message

---

#### Conditional Edge Logic

After `classifyQuestion` completes, the graph router reads `state.isGuardrailed`:

```
if state.isGuardrailed === true  → route to "guardrailResponse"
if state.isGuardrailed === false → route to "answerQuestion"
```

Both paths converge at `END`. The `runChatGraph` function returns `{ answer: state.answer, isGuardrailed: state.isGuardrailed }`.

---

## 6. System Prompts

### `api/prompts/classify.ts`

**Export**: `CLASSIFY_SYSTEM_PROMPT`

**Purpose**: Used by the `classifyReviews` node to assign a sentiment label and a primary theme to each review.

**System message content**:

```
You are a review classification assistant. For each review provided, return a JSON object
with exactly two fields:
  - "sentiment": one of "positive", "neutral", or "negative"
  - "primaryTheme": a 1-to-3-word title-case label for the review's main topic
    (examples: "Ease of Use", "Customer Support", "Pricing", "Performance")

Base sentiment on the overall tone of the review. Use the star rating as a signal
(1-2 stars → lean negative, 3 stars → lean neutral, 4-5 stars → lean positive)
but let the text override the rating when they conflict.

When classifying a batch, return a JSON array where each element corresponds
to the review at the same index in the input.

Output format (batch of N reviews):
{
  "classifications": [
    { "sentiment": "positive", "primaryTheme": "Ease of Use" },
    { "sentiment": "negative", "primaryTheme": "Pricing" },
    ...
  ]
}

Do not include any explanation. Return only valid JSON.
```

**Why strict JSON**: The `classifyReviews` node parses this output programmatically to merge classifications back into the reviews array. Any non-JSON output will cause a parse failure.

---

### `api/prompts/summarize.ts`

This file exports three distinct system prompts used by the three downstream ingest graph nodes.

---

**Export**: `THEMES_SYSTEM_PROMPT`

**Used by**: `extractThemes` node

**System message content**:

```
You are a review analysis assistant. You will receive a JSON array of classified reviews.
Each review has a "primaryTheme" (string) and a "sentiment" ("positive", "neutral", or "negative").

Your task: produce a deduplicated list of themes found across all reviews.

For each theme, output:
  - "label": the theme name (1-3 words, title case — must match the primaryTheme values exactly)
  - "reviewCount": number of reviews whose primaryTheme matches this label
  - "percentage": (reviewCount / totalReviews) * 100, rounded to 1 decimal place
  - "sentiment": the dominant sentiment across reviews with this theme
    (use whichever of "positive", "neutral", "negative" appears most often for this theme)

Sort themes by reviewCount descending.

Output format:
{
  "themes": [
    { "label": "Ease of Use", "reviewCount": 7, "percentage": 70.0, "sentiment": "positive" },
    ...
  ]
}

Do not include any explanation. Return only valid JSON.
```

---

**Export**: `QUOTES_SYSTEM_PROMPT`

**Used by**: `extractQuotes` node

**System message content**:

```
You are a review analysis assistant. You will receive a JSON array of classified reviews.

Your task: select exactly 4 reviews that together best represent the range of customer experience.
Choose quotes that are specific, vivid, and cover a mix of sentiments and themes.
Aim for variety: do not select 4 reviews with the same sentiment or theme.

Return the selected reviews as a JSON array using their original array indices.

Output format:
{
  "selectedIndices": [2, 7, 14, 23]
}

Do not include any explanation. Return only valid JSON.
```

**Implementation note**: The `extractQuotes` node uses the returned indices to extract the full `Review` objects from the state array and constructs `Quote[]` from them. The LLM does not produce the quote text directly — it only selects indices.

---

**Export**: `SUMMARY_SYSTEM_PROMPT`

**Used by**: `buildSummary` node

**System message content**:

```
You are a review analysis assistant. You will receive two JSON arrays:
  1. "reviews": all classified reviews (with sentiment and primaryTheme)
  2. "themes": the extracted theme list (with reviewCount and sentiment)

Your task: produce an executive summary of the review corpus.

Output exactly these four fields:
  - "sentimentScore": a float from 0.0 to 10.0 representing overall customer sentiment.
    0.0 = entirely negative, 10.0 = entirely positive. Weight by review count per sentiment.
  - "topPositiveTheme": the label of the theme with the highest reviewCount and sentiment "positive"
  - "topNegativeTheme": the label of the theme with the highest reviewCount and sentiment "negative"
  - "overview": a 2-to-4 sentence plain-language summary of the overall sentiment and key themes.
    Write for an Online Reputation Management analyst. Be specific, reference the top themes.

Output format:
{
  "sentimentScore": 7.4,
  "topPositiveTheme": "Ease of Use",
  "topNegativeTheme": "Pricing",
  "overview": "..."
}

Do not include any explanation. Return only valid JSON.
```

---

### `api/prompts/chat.ts`

**Export**: `CHAT_SYSTEM_PROMPT`

**Purpose**: Used by both nodes in the chat graph: `classifyQuestion` (with a classification instruction appended) and `answerQuestion` (with an answering instruction appended).

**Base system message content**:

```
You are an analyst assistant for ReviewLens AI. Your knowledge is strictly limited to
the customer reviews provided to you. You do not have access to any other information.

The reviews provided below are the complete dataset for this session.
You must not reference any information that is not present in these reviews.
You must not make predictions, give personal advice, or speculate beyond what the reviews say.

If a question cannot be answered using only the provided reviews, you must decline clearly
and politely. Do not attempt to answer out-of-scope questions partially.

Examples of questions you MUST decline:
- Questions about future prices, stock performance, or business outcomes
- Requests for personal financial, legal, or medical advice
- Questions about topics not mentioned in any review
- Questions asking you to compare this company to unnamed competitors not mentioned in reviews
```

**Classification instruction** (appended when used by `classifyQuestion`):

```
Your task right now is ONLY to classify whether the following question can be answered
from the provided reviews.

Return exactly:
{ "answerable": true } or { "answerable": false }

Do not answer the question. Do not explain. Return only valid JSON.
```

**Answering instruction** (appended when used by `answerQuestion`):

```
Your task is to answer the following question based strictly on the reviews provided.
Be concise, specific, and reference the review content directly where relevant.
Do not fabricate details. If the evidence is thin, say so.
```

**Guardrail decline message** (fixed string returned by `guardrailResponse` node):

```
I can only answer questions based on the reviews you've loaded. This question falls outside
that scope. Please ask something related to the review content.
```

---

## 7. API Routes

### `api/ingest.ts` — POST /api/ingest

#### Request

```
POST /api/ingest
Content-Type: application/json

Body (URL mode):   { "url": "https://www.trustpilot.com/review/lendingclub.com" }
Body (text mode):  { "text": "I had a great experience with..." }
```

#### Handler Logic

```
1. Parse request body
2. Run IngestBodySchema.safeParse(body)
   → on failure: return HTTP 400 { "message": "<zod error message>" }
3. Branch on body shape:
   a. If 'url' in body:
      - Call scrapeTrustpilot(body.url)
        → on ScraperError: return HTTP 422 { "message": "Could not scrape the provided URL. Check that it is a valid Trustpilot review page." }
      - Call runIngestGraph(scrapedData)
   b. If 'text' in body:
      - Construct a minimal ScrapedData-like structure from the raw text
        (platform: 'Text', url: null, companyName: 'Unknown', reviews parsed line-by-line or as single block)
      - Call runIngestGraph(structuredData)
4. On graph success: return HTTP 200 { ...AnalysisPayload }
5. On any unhandled error: log error internally (console.error), return HTTP 500 { "message": "Analysis failed. Please try again." }
```

#### Response (success)

```
HTTP 200 OK
Content-Type: application/json

{
  "source": { ... },    // ReviewSource
  "summary": { ... },   // AnalysisSummary
  "themes": [ ... ],    // Theme[]
  "quotes": [ ... ],    // Quote[]
  "reviews": [ ... ]    // Review[]
}
```

#### Response (error)

All error responses follow the same shape:

```
HTTP 4xx or 500
Content-Type: application/json

{ "message": "<sanitized human-readable message>" }
```

Stack traces, internal error messages, and any PII from the scraping process are never included in the client response.

#### Timing Note

Scraping 5 pages of Trustpilot followed by a 5-node LangGraph pipeline will typically take 15–40 seconds depending on Trustpilot response times, Playwright cold start, and OpenAI latency. The frontend must display a loading/progress state for the entire duration. The Vercel function timeout must be configured to at least 60 seconds (`maxDuration: 60` in `vercel.json`).

---

### `api/chat.ts` — POST /api/chat (SSE)

#### Request

```
POST /api/chat
Content-Type: application/json

{
  "question": "What do customers say about customer support?",
  "reviewIds": ["r-1", "r-2", "r-3", ...]
}
```

#### SSE Protocol Specification

The response uses Server-Sent Events (SSE) — a unidirectional text stream from server to client over a persistent HTTP connection. No WebSocket upgrade is needed.

**Required response headers**:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no       ← disables Nginx buffering if behind a proxy
```

**Event format**: Each event is a newline-delimited message conforming to the SSE specification:

```
data: <token or signal>\n\n
```

The double newline `\n\n` terminates each event. The frontend reads the stream and parses the `data:` prefix from each event.

**Event sequence**:

```
data: The\n\n
data:  customer\n\n
data:  support\n\n
data:  reviews\n\n
data:  are...\n\n
data: [DONE]\n\n
```

**Terminal signals**:

| Signal | Meaning |
|---|---|
| `data: [DONE]\n\n` | Stream complete; close the connection |
| `data: [ERROR]\n\n` | A server-side error occurred; close the connection |

The frontend accumulates all token chunks into a single string. When `[DONE]` is received, the assembled string is the final answer. The `[ERROR]` signal causes the frontend to display its generic error message.

**Guardrail flow via SSE**: If the `classifyQuestion` node returns `isGuardrailed = true`, the guardrail message is streamed token-by-token (or as a single chunk) using the same `data: <chunk>\n\n` format, followed by `data: [DONE]\n\n`. The frontend does not receive a separate guardrail signal — it infers the guardrail state from the `isGuardrailed` field returned alongside the answer (see below).

**Implementation note for Vercel**: Vercel Serverless Functions support streaming responses using the `Response` object with a `ReadableStream` body. Express uses `res.write()`. The handler must be implemented to support both environments, or two separate implementations must be maintained. For MVP, target Express locally and Vercel streaming serverless for production.

#### Handler Logic

```
1. Set SSE headers
2. Parse request body
3. Run ChatBodySchema.safeParse(body)
   → on failure: write "data: [ERROR]\n\n", close
4. Reconstruct reviewTexts from reviewIds
   (for MVP: the review texts are passed from the frontend Zustand store
    via the existing reviews array — see Section 9 for the frontend change needed)
5. Call runChatGraph(question, reviewTexts) with streaming enabled
6. For each token chunk from the OpenAI stream:
   → write "data: <chunk>\n\n"
7. On stream completion: write "data: [DONE]\n\n", close
8. On any error: log internally, write "data: [ERROR]\n\n", close
```

**Note on `reviewIds` → `reviewTexts`**: The current `ChatBodySchema` sends `reviewIds` (string array). The backend has two options for the MVP:
- **Option A (recommended for MVP)**: Change the frontend to send `reviewTexts` directly alongside the question, avoiding any server-side state lookup. This requires a one-line change to `useChat.ts` (send `reviews.map(r => r.text)` instead of IDs).
- **Option B**: Maintain a server-side session cache (Redis or in-memory Map keyed by a session ID) that stores the `AnalysisPayload` after ingest. Look up reviews by ID at chat time.

Option A is specified here as the MVP path. The schema field can remain `reviewIds` for compatibility, but the frontend sends the full text content as the IDs array values is refactored — or the schema is updated to `reviewTexts: string[]`. Document this decision before implementation.

---

## 8. Environment Variables

All environment variables are accessed exclusively via `process.env`. A startup validation function in `api/lib/errors.ts` (or a dedicated `api/lib/config.ts`) must check for required variables at module load time and throw a descriptive error if any are missing. Never provide fallback values for secret keys.

### Required Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | None — fail at startup | OpenAI API key for GPT-4o calls in all LLM nodes |
| `MAX_SCRAPE_PAGES` | No | `5` | Maximum number of Trustpilot pages to scrape per ingest request |
| `NODE_ENV` | No | `development` | Controls logging verbosity; in `production`, suppress verbose logs |

### Startup Validation Pattern

At module initialization in `api/lib/openai.ts`:

```typescript
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error('[startup] OPENAI_API_KEY is not set. Set it in .env or Vercel environment variables.')
}
```

This ensures the server fails immediately and loudly at cold start rather than at the first API call.

### Local Development

Create a `.env` file at the repository root (never commit it — add to `.gitignore`):

```
OPENAI_API_KEY=sk-...
MAX_SCRAPE_PAGES=2
NODE_ENV=development
```

In production, set these in the Vercel dashboard under **Project → Settings → Environment Variables**.

---

## 9. Frontend Integration Notes

The frontend is currently using mock data for both ingest and chat. Two targeted changes are required once the backend is deployed. No changes to types, components, the Zustand store, or `src/lib/api.ts` are needed.

### Change 1: Wire `useIngest` to the Real API

**File**: `src/features/ingest/hooks/useIngest.ts`

**Current behavior**: `submit()` calls `setAnalysis(mockAnalysisPayload)` and navigates immediately.

**Required change**: Replace the mock call with an async API call. The `api` client in `src/lib/api.ts` is already fully implemented with `api.ingestUrl(url)` and `api.ingestText(text)` — no changes needed there.

The `submit` function must become async, set a loading state before the call, call the appropriate `api` method based on `mode`, and handle errors by setting an error state. On success, call `setAnalysis(payload)` and navigate.

The `useIngestStore` already has the `mode`, `url`, and `text` fields needed to branch the call. A `loading` and `error` field should be added to the store (or managed locally in the hook).

### Change 2: Wire `useChat` to SSE Streaming

**File**: `src/features/chat/hooks/useChat.ts`

**Current behavior**: `sendMessage()` calls `api.chat(question, reviewIds)`, which uses `fetch` and awaits a JSON response. This works for the current non-streaming stub but does not support SSE.

**Required approach**: Use the `fetch` API with `ReadableStream` (not `EventSource`).

`EventSource` is rejected here because:
- `EventSource` only supports `GET` requests; the chat endpoint uses `POST` (required to send the question and review IDs in the body)
- `fetch` with `ReadableStream` supports `POST`, works in all modern browsers without polyfills, and integrates cleanly with the existing async/await pattern in the hook

**Implementation pattern for `sendMessage`**:

```
1. Append the user message to chatHistory (same as now)
2. Set status to 'thinking'
3. Open a fetch POST to /api/chat with { question, reviewIds } in the body
4. Read response.body as a ReadableStream with a TextDecoder
5. Accumulate token chunks into a string buffer as each SSE data event arrives
6. Parse each line: if it starts with "data: ", extract the content
   - If content is "[DONE]", finalize the message and append to chatHistory
   - If content is "[ERROR]", append the error fallback message
   - Otherwise, append the token to the buffer (streaming display)
7. For real-time streaming display: update a `streamingBuffer` state variable
   on each token so the UI shows the answer being typed
8. Set status back to 'idle' after [DONE] or [ERROR]
```

**Note on `reviewIds` vs `reviewTexts`**: As discussed in Section 7, the MVP recommendation is to pass `reviews.map(r => r.text)` to the backend instead of (or in addition to) IDs, to avoid server-side state. The exact field name sent should match the final `ChatBodySchema` implementation.

---

## 10. Development Setup

### Running Locally

The backend runs as a standard Express server during local development. The Vite frontend dev server (port 5173) proxies `/api/*` requests to the Express server (port 3001) via Vite's `server.proxy` configuration.

**Start backend**:
```
cd api
npm run dev
```

**Start frontend** (separate terminal):
```
npm run dev
```

The Vite config (`vite.config.ts`) must include:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

### Package Scripts

Add the following to a `package.json` in the `api/` directory (or augment the root `package.json`):

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only server.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/server.js"
  }
}
```

`server.ts` is a minimal Express entry point that mounts the route handlers from `ingest.ts` and `chat.ts`. This file is only used locally — in production, Vercel invokes each handler directly.

### npm Packages to Install

```
npm install express @langchain/langgraph @langchain/openai crawlee playwright zod
npm install -D typescript ts-node-dev @types/express @types/node
```

After installing Playwright, run `npx playwright install chromium` to download the headless browser binary. In production (Vercel), use the `@sparticuz/chromium` package with a custom Playwright launch configuration, as Vercel's runtime environment does not include a system Chromium. This is a known constraint of running Playwright in serverless environments.

### `api/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "skipLibCheck": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

### Vercel Serverless Deployment

Vercel automatically detects every `.ts` file in the `api/` directory at the root of the repository and deploys each one as a separate serverless function. No additional configuration is needed for basic routing.

**`vercel.json`** (required for timeout and Playwright support):

```json
{
  "functions": {
    "api/ingest.ts": {
      "maxDuration": 60
    },
    "api/chat.ts": {
      "maxDuration": 30
    }
  }
}
```

The `maxDuration` override is required because the default Vercel hobby plan timeout is 10 seconds, which is insufficient for scraping + AI pipeline.

**Playwright on Vercel**: Vercel does not support full Playwright + Chromium in serverless functions due to bundle size limits (~50MB) and the AWS Lambda execution environment. Options:
- Use `@sparticuz/chromium` with `playwright-core` (community-supported, ~45MB binary)
- Offload scraping to a separate service (e.g., a small Fly.io or Railway instance running full Node.js) and call it from the ingest function
- For MVP: run scraping locally and test the AI pipeline against a fixed `ScrapedData` fixture until a production scraping solution is chosen

Document the chosen approach before beginning the scraper implementation.

---

## 11. TODO List

```
1.  Set up api/ folder structure and tsconfig
2.  Install backend dependencies (express, langgraph, openai, crawlee, playwright, zod)
3.  Define Zod schemas — ingest.schema.ts and chat.schema.ts
4.  Write selector constants in api/scraper/selectors.ts
5.  Implement Trustpilot scraper with pagination in api/scraper/trustpilot.ts
6.  Write system prompts — classify.ts, summarize.ts (three exports), chat.ts
7.  Define LangGraph state schema in api/graph/state.ts
8.  Implement ingest graph — all five nodes — in api/graph/ingestGraph.ts
9.  Implement chat graph with guardrail conditional edge in api/graph/chatGraph.ts
10. Implement POST /api/ingest route handler in api/ingest.ts
11. Implement POST /api/chat SSE route handler in api/chat.ts
12. Add Vite proxy config and wire useIngest to real API call
13. Refactor useChat to use fetch ReadableStream for SSE consumption
14. End-to-end test with https://www.trustpilot.com/review/lendingclub.com
```
