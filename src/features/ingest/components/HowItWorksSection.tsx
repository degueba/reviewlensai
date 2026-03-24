import { Link2, BarChart2, MessageSquare } from 'lucide-react'

const STEPS = [
  { icon: Link2, label: 'Ingest', description: 'Paste a URL or raw review text' },
  { icon: BarChart2, label: 'Analyze', description: 'Get themes, sentiment & key quotes' },
  { icon: MessageSquare, label: 'Interrogate', description: 'Ask questions answered only from your data' },
]

export function HowItWorksSection() {
  return (
    <div className="mt-16 w-full max-w-2xl">
      <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        How it works
      </p>
      <div className="grid grid-cols-3 gap-4">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card">
              <step.icon className="size-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">{i + 1}.</span>
                <span className="text-sm font-semibold text-foreground">{step.label}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
