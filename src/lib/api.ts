import type { AnalysisPayload } from '@/types'

const BASE_URL = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  ingestUrl: (url: string): Promise<AnalysisPayload> =>
    request<AnalysisPayload>('/ingest', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  ingestText: (text: string): Promise<AnalysisPayload> =>
    request<AnalysisPayload>('/ingest', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  chat: (question: string, reviewIds: string[]): Promise<{ answer: string; guardrailed: boolean }> =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify({ question, reviewIds }),
    }),
}
