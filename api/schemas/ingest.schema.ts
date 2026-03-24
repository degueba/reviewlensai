import { z } from 'zod'

export const IngestUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
})

export const IngestTextSchema = z.object({
  text: z.string().min(50, 'Text must be at least 50 characters'),
})

export const IngestBodySchema = z.union([IngestUrlSchema, IngestTextSchema])

export type IngestUrlBody = z.infer<typeof IngestUrlSchema>
export type IngestTextBody = z.infer<typeof IngestTextSchema>
export type IngestBody = z.infer<typeof IngestBodySchema>
