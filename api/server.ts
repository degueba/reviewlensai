if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config')
}

import express from 'express'
import ingestHandler from './ingest.js'
import chatHandler from './chat.js'

const app = express()

app.use(express.json())

app.post('/api/ingest', ingestHandler)
app.post('/api/chat', chatHandler)

const PORT = process.env.PORT ?? 3001

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
