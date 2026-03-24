import { ScraperError } from '../_lib/errors.js'

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

interface AppMeta {
  trackName: string
  averageUserRating: number
  userRatingCount: number
}

function extractAppId(input: string): string {
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  const match = trimmed.match(/id[=\/]?(\d+)/i)
  if (!match) throw new ScraperError('Could not extract App ID — provide a numeric App ID or an App Store URL')
  return match[1]
}

async function fetchAppMeta(appId: string): Promise<AppMeta> {
  console.log(`[itunes] fetching app metadata for id=${appId}`)
  const res = await fetch(`https://itunes.apple.com/lookup?id=${appId}`)
  if (!res.ok) throw new ScraperError(`iTunes lookup failed: ${res.status}`)
  const json = (await res.json()) as { results?: AppMeta[] }
  const app = json.results?.[0]
  if (!app) throw new ScraperError(`No app found for App ID ${appId}`)
  console.log(
    `[itunes] app: "${app.trackName}", rating=${app.averageUserRating}, totalRatings=${app.userRatingCount}`
  )
  return {
    trackName: app.trackName,
    averageUserRating: app.averageUserRating,
    userRatingCount: app.userRatingCount,
  }
}

async function fetchReviewPage(appId: string, page: number): Promise<ScrapedReview[]> {
  console.log(`[itunes] fetching review page ${page}`)
  const url = `https://itunes.apple.com/us/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json`
  const res = await fetch(url)
  if (!res.ok) throw new ScraperError(`iTunes reviews fetch failed on page ${page}: ${res.status}`)
  const json = (await res.json()) as { feed?: { entry?: unknown } }
  const raw = json.feed?.entry
  if (!raw) return []
  const entries = Array.isArray(raw) ? raw : [raw]
  return entries.map((e: Record<string, unknown>) => {
    const author = (e['author'] as Record<string, Record<string, string>> | undefined)?.['name']?.['label'] ?? 'Anonymous'
    const rating = parseInt(
      ((e['im:rating'] as Record<string, string> | undefined)?.['label']) ?? '1',
      10
    )
    const dateIso = ((e['updated'] as Record<string, string> | undefined)?.['label']) ?? new Date().toISOString()
    const text = ((e['content'] as Record<string, string> | undefined)?.['label']) ?? ''
    return { author, rating, dateIso, text }
  })
}

export async function scrapeItunes(input: string): Promise<ScrapedData> {
  const appId = extractAppId(input)
  const maxPages = Math.max(1, Math.min(10, parseInt(process.env.MAX_SCRAPE_PAGES ?? '5', 10)))
  console.log(`[itunes] starting iTunes fetch: appId=${appId}, maxPages=${maxPages}`)

  const meta = await fetchAppMeta(appId)
  const allReviews: ScrapedReview[] = []

  for (let page = 1; page <= maxPages; page++) {
    const reviews = await fetchReviewPage(appId, page)
    if (reviews.length === 0) {
      console.log(`[itunes] page ${page} returned no reviews — stopping early`)
      break
    }
    allReviews.push(...reviews)
    console.log(`[itunes] page ${page}: ${reviews.length} reviews (running total: ${allReviews.length})`)
  }

  console.log(`[itunes] done — ${allReviews.length} reviews collected`)

  return {
    companyName: meta.trackName,
    platform: 'App Store',
    url: `https://apps.apple.com/us/app/id${appId}`,
    overallScore: meta.averageUserRating,
    totalReviewCount: meta.userRatingCount,
    scrapedAt: new Date().toISOString(),
    reviews: allReviews,
  }
}
