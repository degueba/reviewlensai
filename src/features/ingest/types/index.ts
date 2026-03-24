export type IngestMode = 'url' | 'paste'

export interface IngestFormState {
  mode: IngestMode
  url: string
  text: string
}
