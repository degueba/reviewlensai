import { z } from 'zod'

export const ChatBodySchema = z.object({
  question: z
    .string()
    .min(1, 'Question cannot be empty')
    .max(500, 'Question must be 500 characters or fewer'),
  reviewTexts: z
    .array(z.string())
    .min(1, 'At least one review text is required'),
})

export type ChatBody = z.infer<typeof ChatBodySchema>
// Note: reviewTexts replaces the original reviewIds design (Option A from techspec §7).
// The frontend sends reviews.map(r => r.text) directly, avoiding server-side state lookup.
