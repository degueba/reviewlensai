import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MessageSquare } from 'lucide-react'
import { ChatMessageThread } from './ChatMessageThread'
import { ChatInputBar } from './ChatInputBar'
import { useChat } from '../hooks/useChat'

interface ChatDrawerProps {
  open: boolean
  onClose: () => void
}

export function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const { chatHistory, status, input, setInput, sendMessage, streamingBuffer } = useChat()

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-6 sm:max-w-md" side="right">
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
