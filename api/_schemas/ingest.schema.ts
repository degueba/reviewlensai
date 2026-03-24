import { z } from 'zod'

export const IngestUrlSchema = z.object({
  url: z.string().refine(
    (v) => /^\d+$/.test(v.trim()) || /id[=\/]?\d+/i.test(v),
    'Must be an App Store URL (apps.apple.com/...id{digits}) or a numeric App ID'
  ),
})

export const IngestTextSchema = z.object({
  text: z.string().min(50, 'Text must be at least 50 characters'),
})

export const IngestBodySchema = z.union([IngestUrlSchema, IngestTextSchema])

export type IngestUrlBody = z.infer<typeof IngestUrlSchema>
export type IngestTextBody = z.infer<typeof IngestTextSchema>
export type IngestBody = z.infer<typeof IngestBodySchema>
