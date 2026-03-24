import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Link2, FileText, Loader2 } from 'lucide-react'
import { useIngest } from '../hooks/useIngest'

export function IngestForm() {
  const { state, setMode, setUrl, setText, submit, loading, error } = useIngest()

  return (
    <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-lg">
      <Tabs value={state.mode} onValueChange={(v) => setMode(v as 'url' | 'paste')} className="flex flex-col gap-4">
        {/* Row 1: mode switcher */}
        <TabsList className="w-full gap-2">
          <TabsTrigger value="url" className="flex-1 gap-2 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground! data-[state=active]:shadow-none!">
            <Link2 className="size-3.5" /> URL
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex-1 gap-2 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground! data-[state=active]:shadow-none!">
            <FileText className="size-3.5" /> Paste Text
          </TabsTrigger>
        </TabsList>

        {/* Row 2: input area */}
        <TabsContent value="url" className="mt-0 space-y-2">
          <Input
            placeholder="https://www.trustpilot.com/review/example.com"
            value={state.url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="bg-input/50"
          />
          <p className="text-xs text-muted-foreground">
            Supports Trustpilot URLs. We'll scrape and analyze the reviews automatically.
          </p>
        </TabsContent>

        <TabsContent value="paste" className="mt-0 space-y-2">
          <Textarea
            placeholder="Paste review text here, one review per line or separated by blank lines..."
            value={state.text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="resize-none bg-input/50"
          />
          <p className="text-xs text-muted-foreground">
            Paste raw text from any review platform. We'll parse and structure it for you.
          </p>
        </TabsContent>

        {/* Row 3: error + submit */}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <Button className="w-full" onClick={submit} size="lg" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing…</> : 'Analyze Reviews'}
        </Button>
      </Tabs>
    </div>
  )
}
