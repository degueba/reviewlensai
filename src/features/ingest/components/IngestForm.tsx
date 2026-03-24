import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Link2, FileText, Loader2, Car, Home, ShoppingBag, TrendingUp, DollarSign } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useIngest } from '../hooks/useIngest'

const FEATURED_APPS: { name: string; id: string; Icon: LucideIcon; bg: string; fg: string }[] = [
  { name: 'Uber',      id: '368677368', Icon: Car,         bg: 'bg-black',        fg: 'text-white'  },
  { name: 'Airbnb',   id: '401626263', Icon: Home,        bg: 'bg-[#FF5A5F]',   fg: 'text-white'  },
  { name: 'DoorDash', id: '719972451', Icon: ShoppingBag, bg: 'bg-[#FF3008]',   fg: 'text-white'  },
  { name: 'Robinhood',id: '938003185', Icon: TrendingUp,  bg: 'bg-[#00C805]',   fg: 'text-black'  },
  { name: 'Cash App', id: '711923939', Icon: DollarSign,  bg: 'bg-[#00D64F]',   fg: 'text-black'  },
]

export function IngestForm() {
  const { state, setMode, setUrl, setText, submit, loading } = useIngest()

  return (
    <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-lg">
      <Tabs value={state.mode} onValueChange={(v) => setMode(v as 'url' | 'paste')} className="flex flex-col gap-4">
        {/* Row 1: mode switcher */}
        <TabsList className="w-full gap-2">
          <TabsTrigger value="url" className="flex-1 gap-2 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground! data-[state=active]:shadow-none!">
            <Link2 className="size-3.5" /> URL
          </TabsTrigger>
          <TabsTrigger disabled value="paste" className="flex-1 gap-2 data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground! data-[state=active]:shadow-none!">
            <FileText className="size-3.5" /> Paste Text
          </TabsTrigger>
        </TabsList>

        {/* Row 2: input area */}
        <TabsContent value="url" className="mt-0 space-y-3">
          <Input
            placeholder="https://apps.apple.com/us/app/uber/id=368677368"
            value={state.url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="bg-input/50"
          />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Try a popular app:</p>
            <div className="flex flex-wrap gap-2">
              {FEATURED_APPS.map(({ name, id, Icon, bg, fg }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUrl(id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${bg} ${fg}`}
                >
                  <Icon className="size-3" />
                  {name}
                </button>
              ))}
            </div>
          </div>
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

        {/* Row 3: submit */}
        <Button className="w-full" onClick={submit} size="lg" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing…</> : 'Analyze Reviews'}
        </Button>
      </Tabs>
    </div>
  )
}
