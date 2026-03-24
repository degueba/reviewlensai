# ReviewLens AI — Deployment Reference

## Prerequisites

- Vercel account (**Pro plan required** — the free Hobby plan caps function duration at 10s; `api/ingest` needs 60s)
- Vercel CLI: `npm i -g vercel`
- `OPENAI_API_KEY` from [platform.openai.com](https://platform.openai.com)

---

## Environment Variables

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | Never commit to source control |
| `MAX_SCRAPE_PAGES` | No | `5` | Set to `2` for faster testing |
| `NODE_ENV` | No | `production` | Set automatically by Vercel |
| `PLAYWRIGHT_BROWSERS_PATH` | Yes (Vercel) | — | Set to `0` — prevents runtime browser install attempt |

---

## Known Limitations: Playwright in Serverless

The full `playwright` package bundles Chromium (~170MB), which exceeds Vercel's 50MB zip limit per function. This means:

- **MVP works locally** via the Express dev server (`npm run dev`) where Playwright runs normally.
- **In production**, `api/ingest` with a URL input **fails** because the scraper cannot launch a browser.
- **Text-paste ingestion mode works fine** in production — no scraping is involved.

### Path to fix (TODO before first production deployment)

1. **Recommended**: Replace the Playwright scraper with [`@sparticuz/chromium`](https://github.com/Sparticuz/chromium) + `playwright-core`. This ships a stripped Chromium binary (~44MB) compatible with Lambda/Vercel serverless environments.
2. **Alternative at scale**: Use a managed browser service ([Browserless.io](https://browserless.io), [BrightData](https://brightdata.com)) via WebSocket — no local Chromium binary needed at all.

---

## Known Limitations: Vercel Handler Compatibility

Vercel serverless functions receive the raw Node.js `http.IncomingMessage` object. Unlike Express, `req.body` is **not pre-parsed** — JSON body parsing must be done manually in each handler.

Currently, both `api/ingest.ts` and `api/chat.ts` rely on `express.json()` middleware, which is only active when running through `api/server.ts` locally. As a result:

- Handlers that call `req.body` directly will receive `undefined` in production.
- **Fix needed before production**: add a body-parser shim inside each handler (e.g. read the raw stream and `JSON.parse` it), or wrap each handler in a minimal per-request Express app.

This TODO and the Playwright TODO should be resolved together before the first production deployment.

---

## Deployment Steps

1. **Login**
   ```bash
   vercel login
   ```

2. **Link the project** (run once per machine)
   ```bash
   vercel link
   ```

3. **Add environment variables**
   ```bash
   vercel env add OPENAI_API_KEY
   ```
   Or add all variables via the Vercel dashboard.

4. **Set `PLAYWRIGHT_BROWSERS_PATH=0`** in the Vercel dashboard to prevent Vercel from attempting a browser install at runtime.

5. **Deploy to production**
   ```bash
   vercel --prod
   ```

---

## Frontend Routing

The `vercel.json` rewrites include a catch-all rule:

```json
{ "source": "/(.*)", "destination": "/index.html" }
```

This is required because ReviewLens AI uses React Router for client-side routing. When a user navigates directly to a URL like `/analysis` (e.g. by pasting it in the browser or refreshing the page), Vercel would normally look for a static file or function at that path and return a 404 when none exists.

The catch-all rewrite ensures that every non-API request is served `index.html`, allowing React Router to parse the URL and render the correct view client-side. The two explicit `/api/*` rewrites are listed first so they take priority and are never intercepted by the catch-all.
