import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAnalysisStore } from '@/store/analysisStore'
import { useIngestStore } from '@/store/ingestStore'

export function useIngest() {
  const navigate = useNavigate()
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis)
  const setStoreLoading = useAnalysisStore((s) => s.setLoading)
  const setStoreError = useAnalysisStore((s) => s.setLoadingError)
  const { mode, url, text, setMode, setUrl, setText, reset } = useIngestStore()
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (loading) return
    setLoading(true)
    setStoreLoading(true)
    setStoreError(null)
    navigate('/analysis')

    try {
      const payload = mode === 'url'
        ? await api.ingestUrl(url)
        : await api.ingestText(text)
      setAnalysis(payload)
      reset()
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setStoreLoading(false)
      setLoading(false)
    }
  }

  return { state: { mode, url, text }, setMode, setUrl, setText, submit, loading }
}
