import { PlaywrightCrawler } from 'crawlee'
import { SELECTORS } from './selectors.js'
import { ScraperError } from '../lib/errors.js'

export interface ScrapedReview {
  author: string
  rating: number
  dateIso: string
  text: string
}

export interface ScrapedData {
  companyName: string
  platform: string
  url: string | null
  overallScore: number
  totalReviewCount: number
  scrapedAt: string
  reviews: ScrapedReview[]
}

interface PageMeta {
  companyName: string
  overallScore: number
  totalReviewCount: number
}

function extractSlug(url: string): string {
  const match = url.match(/trustpilot\.com\/review\/([^/?#]+)/)
  return match![1]
}

export async function scrapeTrustpilot(url: string): Promise<ScrapedData> {
  if (!url.includes('trustpilot.com/review/')) {
    throw new ScraperError('Invalid Trustpilot URL')
  }

  const maxPages = Math.max(1, parseInt(process.env.MAX_SCRAPE_PAGES ?? '5', 10))
  const slug = extractSlug(url)
  const baseUrl = `https://www.trustpilot.com/review/${slug}`

  const pageUrls = Array.from({ length: maxPages }, (_, i) => `${baseUrl}?page=${i + 1}`)

  const allReviews: ScrapedReview[] = []
  const meta: { data: PageMeta | null } = { data: null }

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 2,
    requestHandlerTimeoutSecs: 30,
    async requestHandler({ page, request }) {
      await page.waitForSelector(SELECTORS.REVIEW_CARD, { timeout: 15000 })

      // Extract page-level metadata from page 1 only
      if (request.url.includes('page=1') || !request.url.includes('page=')) {
        const nameEl = await page.$(SELECTORS.COMPANY_NAME_SPAN)
        const scoreEl = await page.$(SELECTORS.OVERALL_SCORE)
        const titleEl = await page.$(SELECTORS.COMPANY_TITLE)

        if (!nameEl || !scoreEl || !titleEl) {
          throw new ScraperError('Could not extract company metadata from page 1')
        }

        const nameText = (await nameEl.textContent()) ?? ''
        const scoreText = (await scoreEl.textContent()) ?? ''
        const titleText = (await titleEl.textContent()) ?? ''

        // Title text is like "Reviews 11,233" — strip "Reviews", commas, parse int
        const countMatch = titleText.replace(/Reviews/i, '').replace(/,/g, '').trim()
        const totalReviewCount = parseInt(countMatch, 10)

        meta.data = {
          companyName: nameText.trim(),
          overallScore: parseFloat(scoreText.trim()),
          totalReviewCount: isNaN(totalReviewCount) ? 0 : totalReviewCount,
        }
      }

      const cards = await page.$$(SELECTORS.REVIEW_CARD)

      if (cards.length === 0) {
        throw new ScraperError('No review cards found — possible bot detection or page structure change')
      }

      for (const card of cards) {
        const authorEl = await card.$(SELECTORS.REVIEWER_NAME)
        const dateEl = await card.$(SELECTORS.REVIEW_DATE)
        const starEl = await card.$(SELECTORS.STAR_RATING)
        const textEl = await card.$(SELECTORS.REVIEW_TEXT)

        const author = (await authorEl?.textContent())?.trim() ?? 'Anonymous'
        const dateIso = (await dateEl?.getAttribute('datetime')) ?? new Date().toISOString()
        const altText = (await starEl?.getAttribute('alt')) ?? 'Rated 1 out of 5 stars'
        const reviewText = (await textEl?.textContent())?.trim() ?? ''

        // "Rated 5 out of 5 stars" → parts[1] = "5"
        const ratingParts = altText.split(' ')
        const rating = parseInt(ratingParts[1] ?? '1', 10)

        allReviews.push({ author, rating, dateIso, text: reviewText })
      }
    },
  })

  await crawler.run(pageUrls)

  if (!meta.data) {
    throw new ScraperError('Could not extract company metadata from page 1')
  }

  return {
    companyName: meta.data.companyName,
    platform: 'Trustpilot',
    url: baseUrl,
    overallScore: meta.data.overallScore,
    totalReviewCount: meta.data.totalReviewCount,
    scrapedAt: new Date().toISOString(),
    reviews: allReviews,
  }
}
