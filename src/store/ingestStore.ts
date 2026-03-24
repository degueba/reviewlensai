import { create } from 'zustand'
import type { IngestFormState, IngestMode } from '@/features/ingest/types'

interface IngestStore extends IngestFormState {
  setMode: (mode: IngestMode) => void
  setUrl: (url: string) => void
  setText: (text: string) => void
  reset: () => void
}

const initialState: IngestFormState = {
  mode: 'url',
  url: '',
  text: '',
}

export const useIngestStore = create<IngestStore>()((set) => ({
  ...initialState,
  setMode: (mode) => set({ mode }),
  setUrl: (url) => set({ url }),
  setText: (text) => set({ text }),
  reset: () => set(initialState),
}))
