import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: ReactNode
  sub?: string
  accent?: 'green' | 'red' | 'yellow' | 'default'
}

const accentMap = {
  green: 'text-emerald-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  default: 'text-primary',
}

export function MetricCard({ label, value, sub, accent = 'default' }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-bold', accentMap[accent])}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
