import type { AnalysisPayload } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { message?: string }).message ?? `Request failed: ${res.status}`
    )
  }

  return res.json() as Promise<T>
}

export const api = {
  ingestUrl: (url: string): Promise<AnalysisPayload> =>
    request<AnalysisPayload>('/api/ingest', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  ingestText: (text: string): Promise<AnalysisPayload> =>
    request<AnalysisPayload>('/api/ingest', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  chat: (question: string, reviewTexts: string[]): Promise<Response> =>
    fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, reviewTexts }),
    }),
}