import Link from 'next/link'
import {
  Navigation,
  ChefHat,
  CheckCircle2,
  TrendingUp,
  PieChart,
  Users,
  Lightbulb,
  Bell,
  Upload,
  BarChart3,
  FileSpreadsheet,
  ArrowRight,
  Layers,
} from 'lucide-react'

// ── Shared primitives ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-3">
      {children}
    </p>
  )
}

function SectionHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`font-heading font-semibold tracking-tight text-foreground ${className}`}>
      {children}
    </h2>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Navigation className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold text-[15px] tracking-tight">Northline</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          <a href="#product" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Product</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium px-3.5 py-1.5 hover:bg-primary/90 transition-colors"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="py-24 md:py-32 text-center">
      <div className="max-w-3xl mx-auto px-6">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/6 px-3.5 py-1 text-xs font-medium text-primary mb-7">
          <ChefHat className="h-3 w-3" />
          Northline for Restaurants
        </div>

        {/* Headline */}
        <h1 className="font-heading font-semibold tracking-tight text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.08] mb-6">
          Know your numbers.<br className="hidden sm:block" /> Stay on course.
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-muted-foreground leading-relaxed mb-9 max-w-2xl mx-auto">
          Northline is the weekly operating system for independent restaurant owners. Upload your
          sales, menu, and labour data to see what is driving revenue, where margin is leaking, and
          what needs attention this week.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-medium px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors"
          >
            Start free trial
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="#"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card text-foreground font-medium px-5 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            Book a demo
          </Link>
        </div>

        {/* Supporting line */}
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          No complex setup. No bloated enterprise software. Just clear weekly visibility for better decisions.
        </p>
      </div>
    </section>
  )
}

// ── Trust strip ───────────────────────────────────────────────────────────────

function TrustStrip() {
  const points = [
    'Revenue, margin, labour, and prime cost in one place',
    'Upload CSV or Excel files you already use',
    'Designed for independent restaurants and small groups',
  ]
  return (
    <section className="border-y border-border bg-card py-10">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-center text-[13px] font-medium text-muted-foreground mb-7">
          Built for operators who need clarity fast.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {points.map((point, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-foreground/80 leading-snug">{point}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Problem ───────────────────────────────────────────────────────────────────

function Problem() {
  return (
    <section className="py-24 scroll-mt-14" id="product">
      <div className="max-w-3xl mx-auto px-6">
        <Label>The problem</Label>
        <SectionHeading className="text-2xl md:text-3xl mb-6">
          Most restaurant owners are still running the week from disconnected reports.
        </SectionHeading>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Sales might look strong while margins quietly slip. Labour can creep up without warning.
            Delivery channels can bring revenue while hurting profit. Important decisions often get
            made from exports, spreadsheets, app screenshots, and instinct.
          </p>
          <p>
            Northline brings the numbers together into one weekly view, so you can see what changed,
            what matters, and what to do next.
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Core values ───────────────────────────────────────────────────────────────

function CoreValues() {
  const cards = [
    {
      icon: TrendingUp,
      question: 'Are we actually making money?',
      body: 'Go beyond top-line revenue and see gross margin, labour cost, and prime cost in one place.',
    },
    {
      icon: PieChart,
      question: 'What is hurting margin?',
      body: 'Spot high-revenue low-margin items, discount leakage, and weak channels before they become bigger problems.',
    },
    {
      icon: Users,
      question: 'Is labour under control?',
      body: 'Track labour cost by outlet and compare it against sales to see where efficiency is slipping.',
    },
    {
      icon: Lightbulb,
      question: 'What should I fix this week?',
      body: 'Use owner summaries and alerts to focus on the issues that need attention now.',
    },
  ]

  return (
    <section className="py-24 bg-card border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-xl mb-12">
          <Label>What Northline helps you answer</Label>
          <SectionHeading className="text-2xl md:text-3xl">
            The questions owners ask every week
          </SectionHeading>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map(({ icon: Icon, question, body }, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-6">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-[15px] mb-2 leading-snug">{question}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Feature grid ──────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      icon: BarChart3,
      title: 'Revenue visibility',
      body: 'Track total revenue, monthly trends, channel mix, and outlet performance in one clear view.',
    },
    {
      icon: PieChart,
      title: 'Margin insight',
      body: 'See category margins, top items by revenue, and popular items that look good on paper but hurt profit.',
    },
    {
      icon: Layers,
      title: 'Prime cost control',
      body: 'Understand food cost, labour cost, and prime cost so you can manage the numbers that shape the week.',
    },
    {
      icon: Lightbulb,
      title: 'Owner summary',
      body: 'Get a short weekly summary showing what improved, what worsened, and one recommended next action.',
    },
    {
      icon: Bell,
      title: 'Action-focused alerts',
      body: 'Northline flags unusual discounting, weak margins, labour pressure, and other signals that deserve attention.',
    },
    {
      icon: FileSpreadsheet,
      title: 'Clean imports and file control',
      body: 'Upload spreadsheets, map columns, validate records, and manage imported files without losing track of what is in the system.',
    },
  ]

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-xl mb-12">
          <Label>What's inside</Label>
          <SectionHeading className="text-2xl md:text-3xl">
            Built for weekly restaurant decision-making
          </SectionHeading>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, body }, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center mb-3.5">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-[14px] mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Upload your files',
      body: 'Import sales, menu, and labour data from the CSV or Excel files you already use.',
    },
    {
      icon: CheckCircle2,
      title: 'Map and validate',
      body: 'Northline helps match your columns, checks for missing or invalid data, and prepares everything for import.',
    },
    {
      icon: BarChart3,
      title: 'See the story of the week',
      body: 'Review dashboards for revenue, margin, labour, prime cost, and operational alerts.',
    },
    {
      icon: Lightbulb,
      title: 'Decide what to do next',
      body: 'Use summaries and insights to make better staffing, pricing, menu, and channel decisions.',
    },
  ]

  return (
    <section className="py-24 bg-card border-y border-border scroll-mt-14" id="how-it-works">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-xl mb-14">
          <Label>How it works</Label>
          <SectionHeading className="text-2xl md:text-3xl">
            From spreadsheet to clarity in four steps
          </SectionHeading>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={i} className="relative">
              <div className="flex items-center gap-3 mb-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold font-heading shrink-0">
                  {i + 1}
                </div>
                <div className="h-px flex-1 bg-border lg:hidden" />
              </div>
              <h3 className="font-heading font-semibold text-[15px] mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Differentiation ───────────────────────────────────────────────────────────

function Differentiation() {
  return (
    <section className="py-24 bg-sidebar text-sidebar-foreground">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-primary mb-3">
          Why Northline
        </p>
        <h2 className="font-heading font-semibold tracking-tight text-2xl md:text-3xl text-sidebar-accent-foreground mb-6 leading-snug">
          Not a bloated restaurant suite.<br className="hidden sm:block" /> Not just another dashboard.
        </h2>
        <div className="space-y-4 text-sidebar-foreground/75 leading-relaxed text-[15px]">
          <p>
            Northline is built for independent operators who need a practical weekly system, not
            another complicated platform to manage. It sits between raw reporting and oversized
            enterprise software: simple enough to use regularly, but powerful enough to uncover the
            issues that quietly damage performance.
          </p>
          <p className="text-sidebar-accent-foreground/90">
            You bring the data you already have. Northline helps you use it better.
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Use cases ─────────────────────────────────────────────────────────────────

function UseCases() {
  const items = [
    'Weekly performance reviews',
    'Labour and prime cost checks',
    'Menu margin analysis',
    'Delivery channel evaluation',
    'Outlet comparisons',
    'Manager conversations',
    'Identifying profit leaks early',
    'Keeping data imports organised',
  ]

  return (
    <section className="py-24 border-b border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <Label>Used for</Label>
            <SectionHeading className="text-2xl md:text-3xl">
              What restaurant owners use Northline for
            </SectionHeading>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section className="py-24 bg-card border-b border-border scroll-mt-14" id="pricing">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <Label>Pricing</Label>
        <SectionHeading className="text-2xl md:text-3xl mb-4">
          Simple pricing, by location
        </SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Northline is priced for independent operators who want better weekly control without
          committing to a full enterprise platform.
        </p>
        <div className="rounded-xl border border-border bg-background p-8 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">Starting from</p>
          <p className="font-heading font-semibold text-4xl tracking-tight mb-1">£49</p>
          <p className="text-sm text-muted-foreground mb-6">per location / month</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Clear value, simple setup, and no need to replace your existing systems on day one.
          </p>
        </div>
        <Link
          href="#"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background text-foreground font-medium px-5 py-2.5 text-sm hover:bg-muted transition-colors"
        >
          View pricing
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}

// ── Proof ─────────────────────────────────────────────────────────────────────

function Proof() {
  return (
    <section className="py-24">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <Label>Built for the real world</Label>
        <SectionHeading className="text-2xl md:text-3xl mb-5">
          Designed around the way restaurant owners actually work
        </SectionHeading>
        <p className="text-muted-foreground leading-relaxed">
          Northline is designed for the pressure of real restaurant operations: limited time, tight
          margins, and decisions that need to happen quickly. It is built to help owners and managers
          review the week with more clarity and less guesswork.
        </p>
      </div>
    </section>
  )
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-24 bg-sidebar text-sidebar-foreground">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="font-heading font-semibold tracking-tight text-3xl md:text-4xl text-sidebar-accent-foreground mb-5 leading-tight">
          Know your numbers.<br /> Stay on course.
        </h2>
        <p className="text-sidebar-foreground/70 leading-relaxed mb-9 text-[15px]">
          Northline helps restaurant owners turn everyday data into clearer weekly decisions on
          revenue, margin, labour, and prime cost.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-medium px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors"
          >
            Start free trial
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="#"
            className="inline-flex items-center gap-2 rounded-lg border border-sidebar-border text-sidebar-accent-foreground font-medium px-5 py-2.5 text-sm hover:bg-sidebar-accent transition-colors"
          >
            Book a demo
          </Link>
        </div>
        <p className="text-[12px] text-sidebar-foreground/45">
          Built for independent restaurants. Ready when you are.
        </p>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center shrink-0">
                <Navigation className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="font-heading font-semibold text-sm tracking-tight">Northline</span>
            </div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wider mb-1">Northline for Restaurants</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Know your numbers. Stay on course.</p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-2">
            <a href="#product" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Product</a>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Start free trial</Link>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground/60">© 2025 Northline. All rights reserved.</p>
          <p className="text-xs text-muted-foreground/40">Built for independent restaurant operators.</p>
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <Problem />
        <CoreValues />
        <Features />
        <HowItWorks />
        <Differentiation />
        <UseCases />
        <Pricing />
        <Proof />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
