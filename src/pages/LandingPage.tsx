import { IngestNavbar, HeroSection, IngestForm, HowItWorksSection, IngestFooter } from '@/features/ingest'

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <IngestNavbar />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
        <HeroSection />
        <IngestForm />
        <HowItWorksSection />
      </main>
    </div>
  )
}
