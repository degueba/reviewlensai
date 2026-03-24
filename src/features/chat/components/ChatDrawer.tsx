import { useState, useRef, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MessageSquare } from 'lucide-react'
import { ChatMessageThread } from './ChatMessageThread'
import { ChatInputBar } from './ChatInputBar'
import { useChat } from '../hooks/useChat'

const MIN_WIDTH = 448 // ~sm:max-w-md

interface ChatDrawerProps {
  open: boolean
  onClose: () => void
}

export function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const { chatHistory, status, input, setInput, sendMessage, streamingBuffer } = useChat()
  const [width, setWidth] = useState(MIN_WIDTH)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const maxWidth = window.innerWidth * 0.8
      const newWidth = window.innerWidth - ev.clientX
      setWidth(Math.min(maxWidth, Math.max(MIN_WIDTH, newWidth)))
    }

    const onMouseUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="flex flex-col gap-0 p-6"
        side="right"
        style={{ width, maxWidth: '80vw' }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize transition-colors hover:bg-border"
          onMouseDown={onMouseDown}
        />
        <SheetHeader className="mb-4 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="size-4 text-primary" />
            Ask AI about these reviews
          </SheetTitle>
        </SheetHeader>
        <ChatMessageThread messages={chatHistory} status={status} streamingBuffer={streamingBuffer} />
        <ChatInputBar
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          status={status}
        />
      </SheetContent>
    </Sheet>
  )
}
