import { useState } from 'react'
import { api } from '@/lib/api'
import { useAnalysisStore } from '@/store/analysisStore'
import type { ChatStatus } from '../types'

export function useChat() {
  const chatHistory = useAnalysisStore((s) => s.chatHistory)
  const reviews = useAnalysisStore((s) => s.reviews)
  const appendChatMessage = useAnalysisStore((s) => s.appendChatMessage)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [input, setInput] = useState('')

  const sendMessage = async () => {
    const question = input.trim()
    if (!question || status === 'thinking') return

    const userMsg = {
      id: `msg-${Date.now()}-user`,
      role: 'user' as const,
      content: question,
      timestamp: new Date().toISOString(),
    }
    appendChatMessage(userMsg)
    setInput('')
    setStatus('thinking')

    try {
      const reviewIds = reviews.map((r) => r.id)
      const { answer, guardrailed } = await api.chat(question, reviewIds)
      appendChatMessage({
        id: `msg-${Date.now()}-ai`,
        role: guardrailed ? 'guardrail' : 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
      })
    } catch {
      appendChatMessage({
        id: `msg-${Date.now()}-err`,
        role: 'guardrail',
        content: 'Unable to process your question at the moment. Please try again.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setStatus('idle')
    }
  }

  return { chatHistory, status, input, setInput, sendMessage }
}
