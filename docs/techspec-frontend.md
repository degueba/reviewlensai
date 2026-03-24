# ReviewLens AI — Frontend Technical Specification

## 1. Project Overview

ReviewLens AI is a Review Intelligence Portal that allows users to ingest customer reviews (via URL or pasted text), receive a structured AI-powered analysis (sentiment scoring, theme extraction, key quotes), and then interrogate the data through a guardrailed chat interface that only answers based on the ingested content.

**Repository:** https://github.com/degueba/reviewlensai

---

## 2. Technology Stack

| Concern | Choice | Version |
|---|---|---|
| Build tool | Vite | ^8 |
| UI library | React | ^19 |
| Language | TypeScript | ~5.9 |
| Styling | Tailwind CSS v4 | ^4.2 |
| Component primitives | Shadcn/ui (radix-nova style) + Radix UI | shadcn@latest / radix-ui ^1.4 |
| Client-side routing | React Router DOM | ^7 |
| Global state | Zustand (with persist middleware) | ^5 |
| Icons | Lucide React | ^1 |
| Font | Geist Variable (`@fontsource-variable/geist`) | ^5 |
| Animation utilities | tw-animate-css | ^1.4 |

### Tailwind CSS v4 Configuration

Tailwind v4 is configured entirely via `@tailwindcss/vite` — there is no `tailwind.config.js`. The design system is defined in `src/App.css` using `@theme inline` and CSS custom properties. The `@custom-variant dark` directive enables dark-mode class toggling.

---

## 3. Design System

### Color Palette (dark-first, oklch)

All colors are defined as CSS custom properties in `:root` using the OKLCH color space for perceptually uniform hue manipulation.

| Token | Value | Usage |
|---|---|---|
| `--background` | `oklch(0.08 0.005 264)` | Page background (near-black indigo) |
| `--foreground` | `oklch(0.97 0.003 264)` | Primary text |
| `--card` | `oklch(0.11 0.006 264)` | Card surfaces |
| `--primary` | `oklch(0.6 0.2 264)` | Brand accent (violet/indigo) |
| `--primary-foreground` | `oklch(0.99 0 0)` | Text on primary bg |
| `--secondary` | `oklch(0.16 0.008 264)` | Subtle fills |
| `--muted` | `oklch(0.16 0.008 264)` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.55 0.02 264)` | Secondary text |
| `--border` | `oklch(0.22 0.008 264)` | Borders and dividers |
| `--input` | `oklch(0.18 0.008 264)` | Form input backgrounds |
| `--destructive` | `oklch(0.65 0.2 25)` | Error states (red-orange) |
| `--ring` | `oklch(0.6 0.2 264)` | Focus rings |

Sentiment colors (non-variable, direct Tailwind classes):
- Positive: `emerald-400 / emerald-500`
- Neutral: `yellow-400 / yellow-500`
- Negative: `red-400 / red-500`

### Typography

- Font family: **Geist Variable** (variable weight, loaded via `@fontsource-variable/geist`)
- Applied globally via `--font-sans` CSS variable and `body { font-family: var(--font-sans) }`
- Anti-aliasing: `-webkit-font-smoothing: antialiased`

### Border Radius

| Token | Value |
|---|---|
| `--radius` | `0.625rem` (base) |
| `--radius-sm` | `calc(var(--radius) - 4px)` |
| `--radius-md` | `calc(var(--radius) - 2px)` |
| `--radius-lg` | `var(--radius)` |
| `--radius-xl` | `calc(var(--radius) + 4px)` |

---

## 4. Architecture

### Directory Structure

```
src/
  features/
    ingest/          # Landing page feature: URL/text ingestion
      components/    # IngestNavbar, HeroSection, IngestForm, HowItWorksSection, IngestFooter
      hooks/         # useIngest (form state + API submission + navigation)
      types/         # IngestMode, IngestFormState
      index.ts       # Barrel re-exports
    analysis/        # Analysis dashboard feature
      components/    # AnalysisTopBar, MetricCard(s), ThemesPanel, QuotesPanel, ReviewCard(s)
      hooks/         # useAnalysisStore (re-exported from store)
      types/         # Re-exports from @/types
      index.ts       # Barrel re-exports
    chat/            # Chat drawer feature
      components/    # ChatDrawer, ChatMessageThread, ChatInputBar, GuardrailMessage
      hooks/         # useChat (message state + API submission)
      types/         # ChatMessage re-export, ChatStatus
      index.ts       # Barrel re-exports
  components/
    ui/              # Shadcn/ui primitives (button, tabs, input, textarea, badge, card, sheet, skeleton, separator)
  store/
    analysisStore.ts # Zustand store with persist middleware
  types/
    index.ts         # Shared domain types (ReviewSource, Theme, Quote, Review, AnalysisSummary, AnalysisPayload, ChatMessage)
  mock/
    data.ts          # Mock AnalysisPayload for Flowboard (fictional SaaS) — 10 reviews, 6 themes, 4 quotes
  pages/
    LandingPage.tsx  # Route: /
    AnalysisPage.tsx # Route: /analysis
  lib/
    api.ts           # Typed fetch wrapper + api.ingestUrl / api.ingestText / api.chat
    utils.ts         # cn() helper (clsx + tailwind-merge)
  App.tsx            # BrowserRouter + Routes
  main.tsx           # React root mount, imports App.css
  App.css            # Full design system (Tailwind v4 @theme, CSS variables, base styles)
```

### State Management

**Zustand** (`useAnalysisStore`) is the single source of truth for all analysis data. It uses `persist` middleware (localStorage key: `reviewlens-analysis`) with `partialize` to persist only the data fields — chat history is intentionally ephemeral and not persisted.

Store shape:
- `source: ReviewSource | null`
- `summary: AnalysisSummary | null`
- `themes: Theme[]`
- `quotes: Quote[]`
- `reviews: Review[]`
- `chatHistory: ChatMessage[]` (session-only)
- `setAnalysis(payload)` — called after successful ingest, resets chatHistory
- `appendChatMessage(msg)` — used by useChat
- `clearAnalysis()` — called by "New Analysis" button
- `hasData()` — used by AnalysisPage route guard

### Routing

React Router DOM v7 with `BrowserRouter`:

| Path | Component | Guard |
|---|---|---|
| `/` | `LandingPage` | None |
| `/analysis` | `AnalysisPage` | `hasData()` — redirects to `/` if no data |

---

## 5. Feature Specifications

### 5.1 Ingest Feature (`/`)

**Purpose:** Collect a Trustpilot URL or pasted review text, submit to the API, store the result, and navigate to `/analysis`.

**Components:**
- `IngestNavbar` — Fixed top bar with logo and "AI-Powered" pill badge
- `HeroSection` — Heading, sub-heading, value proposition copy
- `IngestForm` — Tabbed form (URL / Paste Text modes) with error display and loading state
- `HowItWorksSection` — 3-step visual explanation (Ingest → Analyze → Interrogate)
- `IngestFooter` — Minimal footer with tagline

**Hook: `useIngest`**
- Manages `IngestFormState` (mode, url, text, isLoading, error)
- On submit: calls `api.ingestUrl` or `api.ingestText` → calls `setAnalysis` → calls `navigate('/analysis')`
- On error: sets `error` string, clears `isLoading`

### 5.2 Analysis Feature (`/analysis`)

**Purpose:** Display the structured analysis output — metrics, themes, quotes, and individual review cards.

**Components:**
- `AnalysisTopBar` — Sticky header with platform/URL info, date range, "New Analysis" and "Ask AI" buttons
- `MetricCardsRow` — 4-up grid: Sentiment Score (color-coded), Total Reviews, Top Positive Theme, Top Negative Theme
- `MetricCard` — Reusable card with label, value, optional subtitle and accent color
- `ThemesPanel` — Horizontal bar chart per theme with sentiment badge and review count
- `QuotesPanel` — Left-bordered blockquotes with author and theme badge
- `ReviewCardsSection` — Responsive grid of individual `ReviewCard` components
- `ReviewCard` — Avatar initial, author name, date, star rating, review text (3-line clamp), sentiment badge, theme badge

**Sentiment color mapping (used throughout analysis components):**
- Positive → emerald
- Neutral → yellow
- Negative → red

### 5.3 Chat Feature

**Purpose:** Provide a slide-in drawer chat interface for asking questions about the ingested reviews. The AI is guardrailed to only answer from loaded data.

**Components:**
- `ChatDrawer` — Radix Dialog-based Sheet (right side), composed from `ChatMessageThread` + `ChatInputBar`
- `ChatMessageThread` — Scrollable message list with auto-scroll to bottom; renders user, assistant, and guardrail messages differently
- `ChatInputBar` — Input + send button; Enter key sends, Shift+Enter is a no-op
- `GuardrailMessage` — Yellow-tinted alert box with shield icon for out-of-scope AI responses

**Hook: `useChat`**
- Reads `chatHistory` and `reviews` from the Zustand store
- Sends user message immediately to store, then calls `api.chat(question, reviewIds)`
- Appends AI response as `assistant` or `guardrail` role based on `guardrailed` flag
- On error: appends a guardrail message

---

## 6. API Contract

Base URL: `/api` (proxied in dev, same-origin in prod)

### `POST /api/ingest`

**Request (URL mode):**
```json
{ "url": "https://www.trustpilot.com/review/example.com" }
```

**Request (text mode):**
```json
{ "text": "Raw review text content..." }
```

**Response:** `AnalysisPayload`
```typescript
{
  source: ReviewSource
  summary: AnalysisSummary
  themes: Theme[]
  quotes: Quote[]
  reviews: Review[]
}
```

### `POST /api/chat`

**Request:**
```json
{ "question": "What do users say about pricing?", "reviewIds": ["r-1", "r-2", ...] }
```

**Response:**
```json
{ "answer": "...", "guardrailed": false }
```

When `guardrailed: true`, the answer is displayed with the `GuardrailMessage` component to visually indicate the question was out of scope.

---

## 7. Core Types

Defined in `src/types/index.ts`:

```typescript
type SentimentLabel = 'positive' | 'neutral' | 'negative'

interface ReviewSource    // platform, url, dateRange, reviewCount, analyzedAt
interface Theme           // id, label, sentiment, reviewCount, percentage
interface Quote           // id, text, author, rating, sentiment, themeLabel
interface Review          // id, author, rating, date, text, sentiment, primaryTheme
interface AnalysisSummary // sentimentScore, totalReviews, topPositiveTheme, topNegativeTheme, overview
interface AnalysisPayload // source, summary, themes, quotes, reviews
interface ChatMessage     // id, role ('user'|'assistant'|'guardrail'), content, timestamp
```

---

## 8. Development Notes

### Mock Data

`src/mock/data.ts` contains a complete `AnalysisPayload` for a fictional SaaS product called **Flowboard** with 10 reviews, 6 themes (positive/neutral/negative), and 4 key quotes. This can be used during development to bypass the API by calling `setAnalysis(mockAnalysisPayload)` directly.

### Adding a Demo Mode

To preview the Analysis page without a running backend, temporarily modify `useIngest` to short-circuit the API call:

```typescript
import { mockAnalysisPayload } from '@/mock/data'
// replace the try block with:
setAnalysis(mockAnalysisPayload)
navigate('/analysis')
```

### Shadcn Component Notes

- All Shadcn components use the **radix-nova** style with neutral base color
- The `Sheet` component (used for `ChatDrawer`) is built on Radix UI `Dialog` primitive
- Components import from `radix-ui` (the combined package), not individual `@radix-ui/*` packages
- Tailwind v4's `@theme inline` block maps semantic color names to CSS variables so Shadcn utility classes (e.g., `bg-card`, `text-muted-foreground`) resolve correctly

### TypeScript

- Strict mode enabled via `tsconfig.app.json`
- Path alias `@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`)
- No `any` types used — all API responses and state are fully typed
