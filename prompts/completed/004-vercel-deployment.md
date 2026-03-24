<objective>
Configure the ReviewLens AI project for production deployment on Vercel by creating the required configuration files and a developer reference document. No source files (api/, src/) are modified — this prompt is purely infrastructure and documentation.

The two outputs are:
1. `vercel.json` — tells Vercel how to build, route, and run the project
2. `docs/deployment.md` — developer reference covering environment variables, known limitations, and Vercel dashboard setup steps
3. `.vercelignore` — excludes files that must not be uploaded to Vercel
</objective>

<context>
Read @.claude/CLAUDE.md for project rules.

Key facts about the project structure:
- Vercel auto-detects files directly inside `api/` as serverless functions (`api/ingest.ts` → POST /api/ingest, `api/chat.ts` → POST /api/chat)
- Subdirectories inside `api/` (graph/, prompts/, schemas/, scraper/, lib/) are shared modules — Vercel must NOT treat them as endpoints
- The frontend is a Vite + React SPA built to `dist/` — React Router requires all non-api paths to fall through to `index.html`
- `api/ingest.ts` runs a Crawlee PlaywrightCrawler scraper (slow: 15–40s) followed by a 5-node LangGraph pipeline — needs a long function timeout
- `api/chat.ts` streams SSE using `res.write()` — needs streaming support, not Edge runtime
- The project uses `"type": "module"` (ESM) and NodeNext module resolution

Examine these files before writing vercel.json:
@package.json
@tsconfig.api.json
@vite.config.ts
@api/ingest.ts
@api/chat.ts
</context>

<requirements>
### 1. vercel.json

Create `vercel.json` at the repository root. It must configure:

**Build settings**:
- `buildCommand`: run both the frontend build (`vite build`) and the api TypeScript check (`tsc -p tsconfig.api.json --noEmit`). Vercel handles the api/ TypeScript compilation automatically — the build command only needs to produce the frontend `dist/`.
- `outputDirectory`: `dist` (Vite's output directory)
- `installCommand`: `npm install` (default, but explicit for clarity)

**Functions config** (under `"functions"`):
- `"api/ingest.ts"`: `maxDuration: 60` — scraping + LangGraph pipeline requires up to 40s; the Vercel default of 10s will time out. 60s is the maximum on Pro plans.
- `"api/chat.ts"`: `maxDuration: 30` — SSE streaming chat; classification + answer generation takes 5–15s

**Rewrites** (under `"rewrites"`):
- Route `/api/ingest` → `/api/ingest` (explicit, ensures function is invoked)
- Route `/api/chat` → `/api/chat` (explicit)
- Route `/(.*)`  → `/index.html` (catch-all for React Router — must come last)

**Framework preset**: set `"framework": "vite"` so Vercel applies the correct build defaults

### 2. .vercelignore

Create `.vercelignore` to exclude files that must not be uploaded:
- `node_modules/playwright/` — the full Playwright package with bundled Chromium (~170MB) would exceed Vercel's 50MB function zip limit; local dev uses this, production does not
- `.playwright/` — local Playwright browser cache directory
- `prompts/` — internal development prompts, not needed in production
- `docs/` — documentation only, not needed in production
- `.env` — secrets must never be uploaded; they are set in the Vercel dashboard

### 3. docs/deployment.md

Create a developer reference document covering everything a developer needs to deploy and maintain this project on Vercel. Include:

**Section: Prerequisites**
- Vercel account (Pro plan required for 60s function timeout on ingest)
- `vercel` CLI installed globally: `npm i -g vercel`
- `OPENAI_API_KEY` available

**Section: Environment Variables (Vercel Dashboard)**
List each variable, whether it is required, and where to set it (Project → Settings → Environment Variables):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | Set in Vercel dashboard. Never commit. |
| `MAX_SCRAPE_PAGES` | No | `5` | Lower to `2` for faster responses during testing |
| `NODE_ENV` | No | `production` | Vercel sets this automatically |
| `PLAYWRIGHT_BROWSERS_PATH` | Yes (Vercel) | — | Set to `0` to prevent Playwright from attempting browser installation at runtime |

**Section: Known Limitations — Playwright in Serverless**

Explain clearly for future developers:
- The full `playwright` package (~170MB) cannot be deployed to Vercel serverless functions due to the 50MB zip limit
- The current MVP uses the system-installed Playwright locally (via the Express dev server from `npm run dev`)
- **For production scraping on Vercel**, the scraper must be adapted to use `@sparticuz/chromium` + `playwright-core` (a stripped ~44MB Chromium built for Lambda/Vercel). This is a known TODO before the first production deployment.
- Alternative for production at scale: use a managed browser service (Browserless.io, BrightData) to avoid bundling Chromium entirely — the scraper calls an external browser via WebSocket instead of launching locally
- Until this is resolved, the `/api/ingest` endpoint with a URL will fail in production; the text-paste ingestion mode works fine (no scraping required)

**Section: Vercel Handler Compatibility**

Explain that:
- Vercel serverless functions receive Node.js `http.IncomingMessage` / `http.ServerResponse`
- The current handlers use Express types and depend on `req.body` being pre-parsed JSON (provided by `express.json()` middleware in the local dev server)
- In Vercel, `req.body` is not pre-parsed — this must be addressed before the endpoint works in production (either a body-parser shim in each handler, or wrapping the handler in a minimal Express app per request)
- This is a known TODO alongside the Playwright adaptation

**Section: Deployment Steps**
Step-by-step CLI commands to deploy:
1. `vercel login`
2. `vercel link` (connect to existing project or create new)
3. Set environment variables via dashboard or `vercel env add`
4. `vercel --prod` to deploy

**Section: Frontend Routing**
Explain why the catch-all rewrite in `vercel.json` is required: React Router handles routing client-side, so any direct URL hit (e.g., `/analysis`) must serve `index.html` and let React Router take over. Without this, Vercel returns 404 for any route other than `/`.
</requirements>

<output>
Create the following files only — do not modify any existing source files:

- `./vercel.json` — Vercel build, routing, and function configuration
- `./.vercelignore` — files excluded from the Vercel deployment bundle
- `./docs/deployment.md` — developer reference for deployment and known limitations
</output>

<verification>
After implementing, verify:

1. `vercel.json` is valid JSON — run `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))" && echo "valid"`
2. `vercel.json` contains a `maxDuration: 60` entry for `api/ingest.ts`
3. `vercel.json` contains a catch-all rewrite to `/index.html`
4. `.vercelignore` lists `node_modules/playwright/`
5. `docs/deployment.md` contains the Playwright limitation section with clear steps for resolving it
6. No existing source files (api/, src/, package.json) were modified
</verification>

<success_criteria>
- `vercel.json` is valid and complete — a developer can run `vercel --prod` after setting env vars
- `docs/deployment.md` gives any new developer a complete picture of what works, what doesn't, and what needs to be done before full production use
- The Playwright/body-parser limitations are documented clearly so the next developer knows exactly what to fix
- Zero modifications to existing source files
</success_criteria>
