import express, { type Request, type Response } from 'express'
import { ChatBodySchema } from './_schemas/chat.schema.js'
import { runChatGraph } from './_graph/chatGraph.js'

export default async function handler(req: Request, res: Response) {
  if (!req.body) {
    await new Promise<void>((resolve) => express.json()(req, res, () => resolve()))
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const parsed = ChatBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.write('data: [ERROR]\n\n')
    return res.end()
  }

  const { question, reviewTexts } = parsed.data

  try {
    await runChatGraph(question, reviewTexts, (chunk) => {
      res.write(`data: ${chunk.replace(/\n/g, '\\n')}\n\n`)
    })
    res.write('data: [DONE]\n\n')
  } catch (err) {
    console.error('[chat] Unhandled error:', err)
    res.write('data: [ERROR]\n\n')
  }

  res.end()
}
