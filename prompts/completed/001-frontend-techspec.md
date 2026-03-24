<objective>
Create a detailed frontend techspec document for ReviewLens AI — a Review Intelligence Portal for Online Reputation Management analysts. This techspec will define every page, layout, component, and the mock data that drives the UI. It is the authoritative reference for building the frontend, so it must be thorough, prescriptive, and beautiful in its design intent.

The goal is a clean, aesthetically pleasing application that makes it immediately clear to the user what the reviews of a given page/product are saying — at a glance and through interactive exploration.
</objective>

<context>
Read @.claude/CLAUDE.md carefully before proceeding. Pay close attention to:
- The product description: analysts ingest reviews (via URL scraping or pasting text), get a structured summary, then interrogate the data through a guardrailed chat interface
- Frontend rules: Vite + React + TypeScript, Shadcn/ui, Tailwind CSS v4, feature-based folder structure, @/ alias, no inline styles, all API calls via src/lib/api.ts, no `any`

Visual direction: **Bold & modern** — neutral dark sidebar, vibrant accent color, high contrast. Inspired by Vercel and Resend. Sharp, confident, professional.

App structure: **Multi-page with routing** using two primary routes:
- `/` — Landing/Ingest page
- `/analysis` — Analysis Dashboard page

Analysis view layout: **Full-width dashboard with a slide-in chat drawer** — metrics and review cards fill the canvas, a persistent "Ask AI" button opens the chat panel from the right.
</context>

<requirements>
Produce a comprehensive techspec document saved to `./docs/techspec-frontend.md`. It must include all of the following sections:

### 1. Design System
Define the visual foundation:
- Color palette (background, surface, border, text, accent/primary — use a vibrant single accent like indigo, violet, or emerald)
- Typography scale (font family, sizes for headings/body/caption/label)
- Spacing and border-radius conventions
- Shadow and elevation levels
- Icon library (Lucide React — already installed)
- Mapping to Tailwind CSS v4 classes and Shadcn/ui tokens

### 2. Page: Landing / Ingest (`/`)
Define the layout and all components for the ingest page:
- Header/navbar (logo, optional nav links)
- Hero section (headline, subheadline, clear CTA)
- Ingest form with two modes:
  - **URL mode**: input field for a Trustpilot (or similar) URL + Submit button
  - **Paste mode**: textarea to paste raw review text + Submit button
  - Tab switcher to toggle between modes
- Loading state while ingestion runs (skeleton or progress indicator)
- Error state (inline, non-blocking)
- Brief "how it works" section (3 steps, icon + label each)
- Footer

For each component, specify:
- Component name (PascalCase)
- Props interface
- Shadcn/ui component used (if any)
- Tailwind class hints for key visual decisions

### 3. Page: Analysis Dashboard (`/analysis`)
Define the full dashboard layout:

**Top bar** (sticky):
- Product/source label (e.g., "Trustpilot — acme.com")
- Date range of ingested reviews
- "New Analysis" button that returns to `/`
- "Ask AI" button that opens the chat drawer

**Metric cards row** (4 cards across):
- Overall Sentiment Score (e.g., 8.2/10 with color indicator — green/yellow/red)
- Total Reviews Analyzed
- Top Positive Theme
- Top Negative Theme

**Main content grid** (2-column on desktop):
- Left column: Themes breakdown — a list of identified themes, each with sentiment bar and review count
- Right column: Key Quotes — 3–5 notable review excerpts, each tagged with sentiment and theme

**Review cards section** (below grid, full width):
- Individual review cards in a responsive grid (3 columns desktop, 2 tablet, 1 mobile)
- Each card: reviewer name/avatar placeholder, star rating, date, review text excerpt (truncated), sentiment badge, primary theme tag

**Chat Drawer** (slides in from the right, overlays the dashboard):
- Header: "Ask AI about these reviews" + close button
- Message thread (scrollable)
- Input bar at the bottom with Send button
- AI "thinking" indicator
- Guardrail message component (shown when a question is out of scope)

For each component, specify:
- Component name
- Props interface
- Shadcn/ui component used (if any)
- Tailwind class hints

### 4. Feature Folder Structure
Define the exact folder structure under `src/features/` and `src/components/` following the project rules. Include:
- `src/features/ingest/` — components, hooks, types, index.ts
- `src/features/analysis/` — components, hooks, types, index.ts
- `src/features/chat/` — components, hooks, types, index.ts
- `src/components/` — shared UI (layout wrappers, header, footer, etc.)
- `src/lib/api.ts` — API client placeholder
- `src/types/` — shared types

For each file, specify its name and single-sentence purpose.

### 5. Mock Data
Define complete TypeScript mock data that the frontend will use during development (before the API is ready). Include:

```typescript
// Ingest source metadata
const mockSource: ReviewSource = { ... }

// Analysis summary
const mockSummary: AnalysisSummary = { ... }

// Themes list
const mockThemes: Theme[] = [ ... ] // at least 5 themes

// Key quotes
const mockQuotes: Quote[] = [ ... ] // 4 quotes

// Individual reviews
const mockReviews: Review[] = [ ... ] // at least 8 reviews with varied ratings/sentiments
```

Define the TypeScript interfaces for each data shape. Make the data realistic — use a well-known product/brand (e.g., reviews about a fictional SaaS tool called "Flowboard").

### 6. Component Inventory
Produce a flat list of every component in the application with:
- Component name
- File path
- Feature it belongs to (or "shared")
- Whether it uses async data
- Shadcn/ui dependency (if any)

### 7. Routing & Navigation
Define the routing setup:
- Router library to use (React Router v6 — to be installed)
- Route definitions
- How the `/analysis` route receives the ingested data — via the Zustand store (see Section 8)
- Navigation guard: if `/analysis` is visited with no data in the store, redirect to `/`

### 8. State Management & Persistence (Zustand)
Define the global Zustand store with `persist` middleware backed by `localStorage`. This ensures analysis data survives accidental reloads or navigation away from `/analysis`.

Specify:
- Store file location: `src/store/analysisStore.ts`
- The full typed state shape (interfaces only, no implementation):
  - `source: ReviewSource | null`
  - `summary: AnalysisSummary | null`
  - `themes: Theme[]`
  - `quotes: Quote[]`
  - `reviews: Review[]`
  - `chatHistory: ChatMessage[]`
  - Actions: `setAnalysis`, `appendChatMessage`, `clearAnalysis`
- Which fields are persisted to localStorage vs. kept in-memory only (recommendation + reasoning)
- The localStorage key to use (e.g., `"reviewlens-analysis"`)
- How the ingest feature writes to the store after a successful API response
- How `clearAnalysis` is triggered when the user clicks "New Analysis"
- How the navigation guard on `/analysis` reads from the store to check if data is present
- Selector pattern recommendation for reading from the store in components
</requirements>

<constraints>
- This is a planning document, not implementation. Do NOT write React component code — write specs, interfaces, descriptions, and structural decisions.
- All design decisions must map to Shadcn/ui components and Tailwind CSS v4 — no custom component library.
- The accent color must be a single vibrant hue (pick one: indigo, violet, or emerald) and used consistently throughout.
- Every component that shows async data must have a defined loading state and error state.
- No `any` in TypeScript interfaces — all mock data must be fully typed.
- Components must not exceed 150 lines — if a design seems large, note where it should be split.
- The chat drawer is the only place the AI interaction appears. Do not propose inline chat widgets or embedded chat cards.
- Ensure the design reads well in both the spec and when eventually built — be specific about spacing, layout intent, and visual hierarchy.
</constraints>

<output>
Save the complete techspec as: `./docs/techspec-frontend.md`

Structure the document with clear markdown headings matching the 7 sections above. Use tables for component inventories, code blocks for TypeScript interfaces and mock data, and ASCII art or descriptive layout diagrams where helpful.

The document should be thorough enough that a developer could begin implementation without needing to ask clarifying questions about layout, components, or data shapes.
</output>

<verification>
Before saving, verify:
- All 8 sections are present and complete
- Every page has both loading and error states defined
- Mock data covers all data shapes used by components
- Feature folder structure matches the project rules in CLAUDE.md
- The chat drawer is specified with all sub-components (thread, input, guardrail message)
- No implementation code (JSX/TSX) is included — specs only
</verification>

<success_criteria>
- `./docs/techspec-frontend.md` exists and is comprehensive
- A developer reading it can immediately understand the visual design, page structure, component hierarchy, data shapes, and folder layout
- The design conveys bold & modern aesthetics inspired by Vercel/Resend
- Mock data is realistic, typed, and sufficient to render all UI states
</success_criteria>
