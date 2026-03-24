import express, { type Request, type Response } from 'express'
import { IngestBodySchema } from './_schemas/ingest.schema.js'
import { scrapeItunes } from './_scraper/itunes.js'
import type { ScrapedData } from './_scraper/itunes.js'
import { runIngestGraph } from './_graph/ingestGraph.js'
import { ScraperError, toClientError } from './_lib/errors.js'

export default async function handler(req: Request, res: Response) {
  if (!req.body) {
    await new Promise<void>((resolve) => express.json()(req, res, () => resolve()))
  }

  const parsed = IngestBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message })
  }

  const body = parsed.data

  try {
    let scrapedData: ScrapedData

    if ('url' in body) {
      try {
        scrapedData = await scrapeItunes(body.url)
      } catch (err) {
        if (err instanceof ScraperError) {
          return res.status(422).json({
            message: 'Could not fetch reviews. Check that the App Store URL or App ID is valid.',
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

    console.log(scrapedData);

    const payload = await runIngestGraph(scrapedData)
    return res.status(200).json(payload)
  } catch (err) {
    console.error('[ingest] Unhandled error:', err)
    const { error, statusCode } = toClientError(err)
    return res.status(statusCode).json({ message: error })
  }
}
