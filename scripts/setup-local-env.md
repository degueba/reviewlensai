# ReviewLens AI — Local Environment Setup Prompt

Use this prompt with Claude to generate complete local setup instructions for this project.

---

## Prompt

```
You are helping a developer set up ReviewLens AI for local development.
Read the following files to understand the project:
- package.json (scripts, dependencies)
- .env.example (all environment variables)
- api/server.ts (how the Express dev server starts)
- api/graph/ingestGraph.ts (ingest pipeline)
- api/graph/chatGraph.ts (chat pipeline)
- vite.config.ts (frontend dev server)

Then produce a complete LOCAL SETUP GUIDE in Markdown that includes:

1. **Prerequisites** — Node version, any global installs needed.

2. **Clone & install** — exact commands.

3. **Environment variables** — copy .env.example to .env, then explain
   every variable:
   | Variable | Required | Default | Description |
   List each one. Flag which ones the developer must fill in themselves
   (e.g. OPENAI_API_KEY) vs which ones work out of the box.

4. **Running locally** — the single `npm run dev` command and what it
   starts (concurrently: Express API on PORT 3001 + Vite on 5173).
   Explain the VITE_API_URL wiring between frontend and backend.

5. **Architecture overview** — two Mermaid flowchart diagrams:

   a. **Ingest Graph** (LangGraph pipeline triggered by POST /api/ingest):
      Show nodes: assignIds → classifyReviews → (parallel fork) →
      extractThemes + extractQuotes → (join) → buildSummary → END.
      Label each node with: what it does + which LLM model it uses
      (or "deterministic" if no LLM).

   b. **Chat Graph** (LangGraph pipeline triggered by POST /api/chat):
      Show nodes: classifyQuestion → conditional edge →
      answerQuestion (streaming) OR guardrailResponse → END.
      Label the conditional edge with its routing logic.

   Render each diagram as a fenced ```mermaid code block.

6. **Key assumptions & design decisions** — document these specific
   choices made during implementation:
   - Why iTunes App Store RSS API was chosen (public, no auth, paginated).
   - Why reviews are capped at 15 per ingest run.
   - Why theme extraction is deterministic (derived from classifications)
     rather than a separate LLM call.
   - Why classify and quote extraction run in parallel after classifyReviews.
   - Why the chat guardrail is a separate classification node rather than
     a system prompt instruction alone.
   - Why SSE (Server-Sent Events) streaming is used for chat instead of
     a single JSON response.
   - Why VITE_API_URL replaces the Vite proxy for local dev.

7. **Common pitfalls** — at least 3 things that commonly go wrong and
   how to fix them (e.g. missing OPENAI_API_KEY, CORS errors, port conflicts).

Write in a clear, direct technical style. Use headers, code blocks, and
tables where appropriate. Output only the setup guide — no preamble.
```
