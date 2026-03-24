import { Search } from 'lucide-react'

export function IngestNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Search className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight text-foreground">ReviewLens</span>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          AI-Powered
        </span>
      </div>
    </header>
  )
}
