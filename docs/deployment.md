# ReviewLens AI — Deployment Reference

## Prerequisites

- Vercel account (**Pro plan required** — the free Hobby plan caps function duration at 10s; `api/ingest` needs up to 60s)
- `OPENAI_API_KEY` from [platform.openai.com](https://platform.openai.com)

---

## Deploying via Vercel Dashboard (recommended)

1. Push your code to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and click **Import Git Repository**.
3. Select the `reviewlensai` repo — Vercel auto-detects the Vite framework from `vercel.json`.
4. Before clicking **Deploy**, open **Environment Variables** and add:

   | Variable | Value |
   |---|---|
   | `OPENAI_API_KEY` | your key from platform.openai.com |

5. Click **Deploy**. Vercel builds the frontend and deploys the API functions automatically.
6. Every future push to `main` triggers a new production deployment automatically.

---

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | Never commit to source control |
| `MAX_SCRAPE_PAGES` | No | `1` | Increase to fetch more review pages |
| `NODE_ENV` | No | `production` | Set automatically by Vercel |

---

## Deployment Steps (CLI alternative)

```bash
npm i -g vercel
vercel login
vercel link          # connect to existing project or create new
vercel env add OPENAI_API_KEY
vercel --prod
```

---

## Frontend Routing

`vercel.json` includes a catch-all rewrite:

```json
{ "source": "/(.*)", "destination": "/index.html" }
```

React Router handles routing client-side. Without this, navigating directly to `/analysis` would return a 404. The explicit `/api/*` rewrites are listed first so they are never intercepted by the catch-all.
