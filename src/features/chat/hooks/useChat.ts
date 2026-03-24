import { useState } from 'react'
import { useAnalysisStore } from '@/store/analysisStore'
import { api } from '@/lib/api'
import type { ChatStatus } from '../types'

export function useChat() {
  const chatHistory = useAnalysisStore((s) => s.chatHistory)
  const reviews = useAnalysisStore((s) => s.reviews)
  const appendChatMessage = useAnalysisStore((s) => s.appendChatMessage)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [input, setInput] = useState('')
  const [streamingBuffer, setStreamingBuffer] = useState('')

  const sendMessage = async () => {
    const question = input.trim()
    if (!question || status === 'thinking') return

    appendChatMessage({
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    })
    setInput('')
    setStatus('thinking')
    setStreamingBuffer('')

    try {
      const reviewTexts = reviews.map((r) => r.text)
      const res = await api.chat(question, reviewTexts)

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') {
            appendChatMessage({
              id: `msg-${Date.now()}-ai`,
              role: 'assistant',
              content: accumulated,
              timestamp: new Date().toISOString(),
            })
            setStreamingBuffer('')
            return
          }

          if (data === '[ERROR]') {
            appendChatMessage({
              id: `msg-${Date.now()}-err`,
              role: 'guardrail',
              content: 'Unable to process your question at the moment. Please try again.',
              timestamp: new Date().toISOString(),
            })
            setStreamingBuffer('')
            return
          }

          accumulated += data.replace(/\\n/g, '\n')
          setStreamingBuffer(accumulated)
        }
      }
    } catch {
      appendChatMessage({
        id: `msg-${Date.now()}-err`,
        role: 'guardrail',
        content: 'Unable to process your question at the moment. Please try again.',
        timestamp: new Date().toISOString(),
      })
      setStreamingBuffer('')
    } finally {
      setStatus('idle')
    }
  }

  return { chatHistory, status, input, setInput, sendMessage, streamingBuffer }
}
