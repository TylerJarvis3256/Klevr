import { Button } from '@/components/ui/button'
import { Sparkles, Target, FileText, TrendingUp } from 'lucide-react'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/80 to-primary">
      {/* Header */}
      <header className="absolute top-0 left-0 z-50 px-4 -mt-8">
        <Image
          src="/logos/logo-1-transparent.png"
          alt="Klevr - AI-powered career assistant"
          width={280}
          height={100}
          priority
          className="h-auto w-auto max-w-[220px] md:max-w-[260px]"
        />
      </header>

      {/* Hero Section */}
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-accent-teal/10 border border-accent-teal/20">
            <Sparkles className="h-4 w-4 text-accent-teal" />
            <span className="text-sm font-medium text-accent-teal">AI-Powered Career Assistant</span>
          </div>

          {/* Headline */}
          <h1 className="font-lora text-5xl md:text-6xl font-bold mb-6 text-secondary leading-tight">
            Get hired faster with <span className="text-accent-orange">Klevr</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl leading-relaxed text-secondary/80 mb-12 max-w-3xl mx-auto">
            Score job postings, tailor your resume and cover letters, and track every application
            in one clean dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center flex-wrap mb-16">
            <Button asChild variant="cta" size="lg" className="h-14 px-8 text-lg">
              <a href="/auth/login?screen_hint=signup">
                Get Started Free
              </a>
            </Button>
            <Button asChild variant="cta-secondary" size="lg" className="h-14 px-8 text-lg">
              <a href="/auth/login">
                Sign In
              </a>
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <div className="bg-white backdrop-blur-sm rounded-2xl p-6 border border-secondary/10 shadow-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-accent-teal/50">
              <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-accent-teal/20">
                <Target className="h-6 w-6 text-accent-teal" />
              </div>
              <h3 className="font-lora text-lg font-semibold text-secondary mb-2">
                Smart Job Matching
              </h3>
              <p className="text-secondary/80 text-sm leading-relaxed">
                AI assesses your fit for each role and helps you focus on the best opportunities.
              </p>
            </div>

            <div className="bg-white backdrop-blur-sm rounded-2xl p-6 border border-secondary/10 shadow-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-accent-orange/50">
              <div className="h-12 w-12 rounded-xl bg-accent-orange/10 flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-accent-orange/20">
                <FileText className="h-6 w-6 text-accent-orange" />
              </div>
              <h3 className="font-lora text-lg font-semibold text-secondary mb-2">
                Tailored Documents
              </h3>
              <p className="text-secondary/80 text-sm leading-relaxed">
                Generate custom resumes and cover letters for each job in seconds.
              </p>
            </div>

            <div className="bg-white backdrop-blur-sm rounded-2xl p-6 border border-secondary/10 shadow-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-success/50">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-success/20">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-lora text-lg font-semibold text-secondary mb-2">
                Track Progress
              </h3>
              <p className="text-secondary/80 text-sm leading-relaxed">
                Keep all your applications organized in one beautiful pipeline view.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
