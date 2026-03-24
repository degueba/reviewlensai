<objective>
Set up a local Express dev server that mounts the existing api/ route handlers so the full stack (Vite frontend + Node.js API) can be developed and tested locally without deploying to Vercel.

The frontend Vite dev server already proxies `/api` → `http://localhost:3001` (configured in vite.config.ts). This task wires up the server side of that proxy.
</objective>

<context>
Read @.claude/CLAUDE.md for project rules.

Key facts:
- The api/ folder contains route handlers already implemented: `api/ingest.ts` (POST /api/ingest) and `api/chat.ts` (POST /api/chat SSE)
- Both handlers export a default function with signature `(req: Request, res: Response)` using Express types
- The project uses `"type": "module"` in package.json — ESM throughout
- `tsconfig.api.json` uses `module: NodeNext, moduleResolution: NodeNext` — all api/ imports use `.js` extensions
- Vite runs on port 5173, the API server must run on port 3001 (matching the proxy config)
- Express 5 and @types/express are already installed
- The chat endpoint uses SSE — the server must NOT buffer responses (disable compression middleware, do not wrap res.write)
- `process.env.OPENAI_API_KEY` must be present for LLM nodes to work

Examine these files before implementing:
@api/ingest.ts
@api/chat.ts
@api/server.ts (does not exist yet — you will create it)
@package.json
@vite.config.ts
</context>

<requirements>
1. Create `api/server.ts` — the Express application entry point:
   - Import and mount both handlers at their correct paths
   - Add `express.json()` body parsing middleware (required — handlers read `req.body`)
   - Read PORT from `process.env.PORT` with fallback to `3001`
   - Log the server URL on startup
   - Do NOT add compression or any response-buffering middleware — SSE requires raw streaming

2. Install three devDependencies:
   - `tsx` — TypeScript ESM executor (runs api/ files directly without a build step)
   - `nodemon` — file watcher that restarts the server on changes; configured to use `tsx` as its executor
   - `concurrently` — runs multiple npm scripts in parallel with labeled output

3. Create `nodemon.json` at the repository root to configure nodemon:
   - Watch the `api/` directory only
   - Watch only `.ts` files (ignore everything else to avoid noisy restarts)
   - Use `tsx` as the executor: `exec: "tsx api/server.ts"`
   - Set a small delay (`delay: 500`) to debounce rapid file saves

4. Update `package.json` scripts:
   - `"dev:api"`: runs `nodemon` (picks up nodemon.json config automatically) with `NODE_ENV=development`
   - `"dev:vite"`: extracts the existing `"dev"` script value (currently `"vite"`)
   - `"dev"`: runs both using `concurrently` with color labels `[api]` and `[vite]`
   - Keep `"build"`, `"lint"`, `"preview"` scripts unchanged

5. Create `.env.example` at the repository root documenting required environment variables:
   - `OPENAI_API_KEY` — required
   - `MAX_SCRAPE_PAGES` — optional, default 5
   - `NODE_ENV` — optional, default development
   - Note that `.env` must NOT be committed (add to .gitignore if not already present)

6. Verify `.gitignore` contains `.env` — add it if missing.
</requirements>

<implementation>
**Why tsx instead of ts-node**: `tsx` natively supports ESM + NodeNext module resolution without additional configuration. `ts-node` requires extra flags (`--esm`, `--experimentalSpecifierResolution`) that conflict with the existing tsconfig.api.json setup.

**Why nodemon + tsx instead of tsx watch alone**: Both achieve hot reload, but nodemon gives finer control — the `nodemon.json` config lets you scope watching to specific directories and extensions, add ignore patterns, and tune the restart debounce. This prevents spurious restarts when unrelated files change (e.g., src/ frontend files). nodemon is also a familiar tool for Express developers and plays well with the rest of the Node.js ecosystem.

**nodemon.json exec field**: nodemon executes `tsx api/server.ts` on each restart. Because the project is ESM (`"type": "module"`), tsx handles the NodeNext imports transparently — no extra flags needed.

**Why concurrently instead of shell `&`**: Cross-platform (works on Windows), provides labeled color output per process, and handles process group cleanup correctly when one process crashes.

**SSE constraint**: The chat handler uses `res.write()` and `res.flushHeaders()` for SSE streaming. Any middleware that buffers the response (e.g., `compression`) will break streaming. Only add `express.json()` — nothing else.

**Body parsing**: Express 5 no longer includes body parsing by default. `express.json()` must be added explicitly or `req.body` will be undefined, causing all Zod schema validations to fail.

**Environment variables**: nodemon does not auto-load `.env`. Add `dotenv/config` as a side-effect import at the top of `api/server.ts`, guarded to development only: `if (process.env.NODE_ENV !== 'production') { await import('dotenv/config') }`. Install `dotenv` as a devDependency as well.
</implementation>

<output>
Create or modify the following files:

- `./api/server.ts` — Express app entry point (new file)
- `./nodemon.json` — nodemon watcher configuration (new file)
- `./package.json` — updated scripts and devDependencies
- `./.env.example` — environment variable documentation (new file)
- `./.gitignore` — ensure `.env` is listed (add if missing)
</output>

<verification>
After implementing, verify:

1. Run `npm install` to confirm tsx, nodemon, concurrently, and dotenv are added to package.json devDependencies
2. Confirm `api/server.ts` compiles without TypeScript errors: `npx tsc -p tsconfig.api.json --noEmit`
3. Confirm `nodemon.json` exists and is valid JSON: `node -e "JSON.parse(require('fs').readFileSync('nodemon.json','utf8'))" && echo "valid"`
4. Confirm the `dev` script launches both processes: `npm run dev` should show two labeled output streams `[api]` and `[vite]`
5. Confirm the API server restarts when a file inside `api/` is saved
6. Confirm `.env` appears in `.gitignore`
</verification>

<success_criteria>
- `npm run dev` starts both Vite (port 5173) and the Express API server (port 3001) concurrently with labeled output
- Saving any `.ts` file inside `api/` triggers a nodemon restart of the API server
- POST requests to `http://localhost:5173/api/ingest` are proxied to the Express server and return a response (may fail without OPENAI_API_KEY, but must not return a network error)
- No TypeScript compilation errors in api/server.ts
- `.env` is gitignored; `.env.example` documents all variables
</success_criteria>
