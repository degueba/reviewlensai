import { useEffect, useRef } from 'react'
import { GuardrailMessage } from './GuardrailMessage'
import type { ChatMessage } from '@/types'
import type { ChatStatus } from '../types'

interface ChatMessageThreadProps {
  messages: ChatMessage[]
  status: ChatStatus
  streamingBuffer: string
}

export function ChatMessageThread({ messages, status, streamingBuffer }: ChatMessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  if (messages.length === 0 && status === 'idle') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-center text-sm text-muted-foreground">
          Ask anything about the ingested reviews.<br />
          <span className="text-xs">I only answer from data you've loaded.</span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-1 pb-2">
      {messages.map((msg) => {
        if (msg.role === 'guardrail') {
          return <GuardrailMessage key={msg.id} content={msg.content} />
        }
        if (msg.role === 'user') {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                {msg.content}
              </div>
            </div>
          )
        }
        return (
          <div key={msg.id} className="flex justify-start">
            <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm text-foreground">
              {msg.content}
            </div>
          </div>
        )
      })}
      {status === 'thinking' && streamingBuffer && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm text-foreground">
            {streamingBuffer}
            <span className="ml-0.5 inline-block size-1.5 animate-pulse rounded-full bg-muted-foreground" />
          </div>
        </div>
      )}
      {status === 'thinking' && !streamingBuffer && (
        <div className="flex justify-start">
          <div className="flex items-center gap-1 rounded-xl rounded-bl-sm bg-secondary px-3 py-2.5">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
