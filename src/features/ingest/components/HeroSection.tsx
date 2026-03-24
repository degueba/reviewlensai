export function HeroSection() {
  return (
    <div className="text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
        Review Intelligence Portal
      </div>
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Understand what your{' '}
        <span className="text-primary">reviews</span> are really saying
      </h1>
      <p className="mx-auto max-w-xl text-base text-muted-foreground">
        Paste a URL or drop in review text. Get an instant structured analysis — sentiment, themes, quotes — then interrogate the data through an AI that only answers from what you ingested.
      </p>
    </div>
  )
}
