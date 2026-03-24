import type { Request, Response } from 'express'
import { IngestBodySchema } from './schemas/ingest.schema.js'
import { scrapeTrustpilot } from './scraper/trustpilot.js'
import type { ScrapedData } from './scraper/trustpilot.js'
import { runIngestGraph } from './graph/ingestGraph.js'
import { ScraperError, toClientError } from './lib/errors.js'

export default async function handler(req: Request, res: Response) {
  const parsed = IngestBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message })
  }

  const body = parsed.data

  try {
    let scrapedData: ScrapedData

    if ('url' in body) {
      try {
        scrapedData = await scrapeTrustpilot(body.url)
      } catch (err) {
        if (err instanceof ScraperError) {
          return res.status(422).json({
            message: 'Could not scrape the provided URL. Check that it is a valid Trustpilot review page.',
          })
        }
        throw err
      }
    } else {
      // Text mode: wrap pasted content as a single review entry
      scrapedData = {
        companyName: 'Unknown',
        platform: 'Text',
        url: null,
        overallScore: 0,
        totalReviewCount: 1,
        scrapedAt: new Date().toISOString(),
        reviews: [
          {
            author: 'Pasted Review',
            rating: 3,
            dateIso: new Date().toISOString(),
            text: body.text,
          },
        ],
      }
    }

    const payload = await runIngestGraph(scrapedData)
    return res.status(200).json(payload)
  } catch (err) {
    console.error('[ingest] Unhandled error:', err)
    const { error, statusCode } = toClientError(err)
    return res.status(statusCode).json({ message: error })
  }
}
