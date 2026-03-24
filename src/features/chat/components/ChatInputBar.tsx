import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SendHorizonal } from 'lucide-react'
import type { ChatStatus } from '../types'

interface ChatInputBarProps {
  value: string
  onChange: (val: string) => void
  onSend: () => void
  status: ChatStatus
}

export function ChatInputBar({ value, onChange, onSend, status }: ChatInputBarProps) {
  return (
    <div className="flex items-center gap-2 border-t border-border pt-3">
      <Input
        placeholder="Ask about these reviews…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
        disabled={status === 'thinking'}
        className="bg-input/50"
      />
      <Button
        size="icon"
        onClick={onSend}
        disabled={!value.trim() || status === 'thinking'}
      >
        <SendHorizonal className="size-4" />
      </Button>
    </div>
  )
}
