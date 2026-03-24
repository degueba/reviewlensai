import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAnalysisStore } from '@/store/analysisStore'
import { useIngestStore } from '@/store/ingestStore'

export function useIngest() {
  const navigate = useNavigate()
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis)
  const { mode, url, text, setMode, setUrl, setText, reset } = useIngestStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const payload = mode === 'url'
        ? await api.ingestUrl(url)
        : await api.ingestText(text)
      setAnalysis(payload)
      reset()
      navigate('/analysis')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return { state: { mode, url, text }, setMode, setUrl, setText, submit, loading, error }
}
