import { ShieldAlert } from 'lucide-react'

interface GuardrailMessageProps {
  content: string
}

export function GuardrailMessage({ content }: GuardrailMessageProps) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-yellow-400" />
      <p className="text-sm text-yellow-200/80">{content}</p>
    </div>
  )
}
