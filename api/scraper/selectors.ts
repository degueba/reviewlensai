// All stable data-* and semantic HTML selector constants
// Never inline selectors elsewhere — always import from here

export const SELECTORS = {
  // Review cards — one article element per review
  REVIEW_CARD: 'article[data-service-review-card-paper="true"]',

  // Inside each review card
  REVIEWER_NAME: 'span[data-consumer-name-typography="true"]',
  REVIEW_DATE:   'time[data-service-review-date-time-ago="true"]',
  STAR_RATING:   'img[alt^="Rated"]',
  REVIEW_TEXT:   'p[data-relevant-review-text-typography="true"]',

  // Page-level metadata (outside review cards)
  OVERALL_SCORE:     'p[data-rating-typography="true"]',
  COMPANY_TITLE:     'h1#business-unit-title',
  COMPANY_NAME_SPAN: 'h1#business-unit-title span',
} as const
