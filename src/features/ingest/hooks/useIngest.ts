import { useNavigate } from 'react-router-dom'
import { mockAnalysisPayload } from '@/mock/data'
import { useAnalysisStore } from '@/store/analysisStore'
import { useIngestStore } from '@/store/ingestStore'

export function useIngest() {
  const navigate = useNavigate()
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis)
  const { mode, url, text, setMode, setUrl, setText, reset } = useIngestStore()

  const submit = () => {
    setAnalysis(mockAnalysisPayload)
    reset()
    navigate('/analysis')
  }

  return { state: { mode, url, text }, setMode, setUrl, setText, submit }
}
