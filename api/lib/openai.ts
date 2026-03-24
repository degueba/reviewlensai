import { ChatOpenAI } from '@langchain/openai'

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error(
    '[startup] OPENAI_API_KEY is not set. Set it in .env or Vercel environment variables.',
  )
}

// Singleton client — import this in nodes that need a base instance.
// For node-specific temperatures, create a new ChatOpenAI({ apiKey, model, temperature }).
export const openai = new ChatOpenAI({
  model: 'gpt-4.1-mini',
  apiKey,
})
