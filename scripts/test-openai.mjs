/**
 * Quick sanity check for the OpenAI API key.
 * Run: node scripts/test-openai.mjs
 *
 * Reads OPENAI_API_KEY from .env via dotenv, then sends a minimal
 * chat completion request. Prints the response text on success or
 * the full error on failure so you can distinguish quota vs auth vs network.
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// Load .env from project root
const dotenv = await import('dotenv')
dotenv.config()

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('❌  OPENAI_API_KEY is not set in .env')
  process.exit(1)
}

console.log(`🔑  Using key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`)
console.log('📡  Sending test prompt to gpt-4.1-mini...\n')

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: 'Reply with exactly: "OpenAI connection OK"' }],
    max_tokens: 20,
  }),
})

const json = await response.json()

if (!response.ok) {
  console.error(`❌  HTTP ${response.status} — ${json.error?.type ?? 'unknown error'}`)
  console.error(`    message : ${json.error?.message}`)
  console.error(`    code    : ${json.error?.code}`)
  process.exit(1)
}

const text = json.choices?.[0]?.message?.content?.trim()
console.log(`✅  Response : "${text}"`)
console.log(`    model   : ${json.model}`)
console.log(`    tokens  : ${json.usage?.total_tokens} total (prompt=${json.usage?.prompt_tokens}, completion=${json.usage?.completion_tokens})`)
