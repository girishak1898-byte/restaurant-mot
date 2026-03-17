import Link from 'next/link'
import { Check, Minus, ArrowRight, TrendingUp, PieChart, Users, Lightbulb, BarChart3 } from 'lucide-react'
import { NMark } from '@/components/brand/mark'
import { createClient } from '@/lib/supabase/server'
import { PricingContactSalesButton } from './_components/PricingContactSalesButton'

// ── Design primitives ──────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-4">
      {children}
    </p>
  )
}

function SectionHeading({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      className={`font-marketing font-semibold tracking-tight text-foreground ${className}`}
    >
      {children}
    </h2>
  )
}

// ── Nav ────────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
            <NMark className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight">Northline</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          <Link href="/#product" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Product
          </Link>
          <Link href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link href="/pricing" className="text-sm text-foreground font-medium">
            Pricing
          </Link>
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

// ── Hero ───────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-20 pb-16 text-center">
      <div className="max-w-3xl mx-auto px-6">
        <Eyebrow>Pricing</Eyebrow>
        <h1 className="font-marketing font-semibold tracking-tight text-4xl md:text-[2.75rem] leading-[1.1] mb-5">
          Simple pricing for clearer<br className="hidden sm:block" /> weekly decisions
        </h1>
        <p className="text-[17px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Northline helps restaurant owners turn sales, menu, and labour data into a clearer weekly
          view of revenue, margin, labour, and prime cost. Start with the essentials for free, or
          unlock the full operating view with Premium.
        </p>
      </div>
    </section>
  )
}

// ── Pricing cards ──────────────────────────────────────────────────────────────

const FREE_INCLUDES = [
  'Upload CSV and Excel files',
  'Basic revenue overview',
  'Core dashboard access',
  'File management',
  'Limited visibility into weekly performance',
  'Basic data organisation and imports',
]

const FREE_LOCKED = [
  'Full owner summary',
  'Prime cost analysis',
  'Margin leak analysis',
  'Labour performance insights',
  'Advanced alerts',
  'Premium operational recommendations',
]

const PREMIUM_INCLUDES = [
  'Everything in Free',
  'Full owner summary',
  'Prime cost tracking',
  'Food cost and labour cost visibility',
  'Margin leak analysis',
  'High-revenue / low-margin item visibility',
  'Labour cost vs revenue analysis',
  'Premium alerts and action-focused insights',
  'Cleaner weekly decision support',
  'Priority feature access as Northline grows',
]

function PricingCards() {
  return (
    <section className="pb-20 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Free */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
              Free
            </p>
            <div className="flex items-end gap-1.5 mb-4">
              <span className="text-5xl font-bold tracking-tight font-marketing">£0</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-1.5">
              A simple starting point for getting your data into one place.
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Best for owners who want a basic weekly view before committing to deeper operational insight.
            </p>
          </div>

          <Link
            href="/signup"
            className="block w-full rounded-lg border border-border bg-background py-2.5 text-center text-sm font-medium text-foreground hover:bg-muted transition-colors mb-2"
          >
            Start free
          </Link>
          <p className="text-center text-[11px] text-muted-foreground mb-8 leading-relaxed">
            See the basics first. Upgrade when you're ready for the full picture.
          </p>

          {/* Includes */}
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-3">
              Includes
            </p>
            <ul className="space-y-2.5">
              {FREE_INCLUDES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Locked */}
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/70 mb-3">
              Locked in Free
            </p>
            <ul className="space-y-2">
              {FREE_LOCKED.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-muted-foreground/60">
                  <Minus className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/40" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Premium */}
        <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-sm relative overflow-hidden">
          {/* Most popular badge */}
          <div className="absolute top-0 right-0">
            <div className="bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl">
              Most popular
            </div>
          </div>

          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-3">
              Premium
            </p>
            <div className="flex items-end gap-1.5 mb-1.5">
              <span className="text-5xl font-bold tracking-tight font-marketing">£49</span>
              <span className="text-muted-foreground text-sm mb-2">/location/month</span>
            </div>
            <p className="text-xs text-muted-foreground/70 mb-4">
              or <span className="text-foreground font-medium">£39/location/month</span> billed annually
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-1.5">
              The full weekly operating system for restaurant owners.
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Best for operators who want to protect margin, control labour, and make better weekly decisions with confidence.
            </p>
          </div>

          <Link
            href="/signup"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mb-2"
          >
            Start free trial
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="#contact"
            className="block w-full rounded-lg border border-border bg-background py-2 text-center text-sm font-medium text-foreground hover:bg-muted transition-colors mb-2"
          >
            Book a demo
          </Link>
          <p className="text-center text-[11px] text-muted-foreground mb-8 leading-relaxed px-2">
            If one better weekly decision protects margin, Premium pays for itself quickly.
          </p>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-3">
              Includes
            </p>
            <ul className="space-y-2.5">
              {PREMIUM_INCLUDES.map((f, i) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-foreground">
                  <Check
                    className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${i === 0 ? 'text-muted-foreground' : 'text-primary'}`}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Comparison table ───────────────────────────────────────────────────────────

const COMPARISON_ROWS: { feature: string; free: boolean; premium: boolean }[] = [
  { feature: 'Sales uploads',          free: true,  premium: true  },
  { feature: 'Menu uploads',           free: true,  premium: true  },
  { feature: 'Labour uploads',         free: true,  premium: true  },
  { feature: 'Basic revenue dashboard',free: true,  premium: true  },
  { feature: 'File management',        free: true,  premium: true  },
  { feature: 'Owner summary',          free: false, premium: true  },
  { feature: 'Prime cost view',        free: false, premium: true  },
  { feature: 'Margin leak section',    free: false, premium: true  },
  { feature: 'Labour analysis',        free: false, premium: true  },
  { feature: 'Premium alerts',         free: false, premium: true  },
  { feature: 'Weekly action guidance', free: false, premium: true  },
  { feature: 'Advanced operational insight', free: false, premium: true },
]

function ComparisonTable() {
  return (
    <section className="py-20 px-6 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <SectionHeading className="text-2xl md:text-3xl mb-4">
            Choose the level of visibility your restaurant needs
          </SectionHeading>
          <p className="text-muted-foreground leading-relaxed">
            Free helps you get started. Premium helps you run a tighter week.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Table head */}
          <div className="grid grid-cols-3 border-b border-border bg-muted/30 px-6 py-4">
            <div />
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Free
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                Premium
              </p>
            </div>
          </div>

          {COMPARISON_ROWS.map((row, i) => {
            const isDivider = i === 4 // divider before premium-only features
            return (
              <div key={row.feature}>
                {isDivider && (
                  <div className="grid grid-cols-3 px-6 py-3 bg-muted/20 border-y border-border">
                    <p className="col-span-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                      Premium features
                    </p>
                  </div>
                )}
                <div
                  className={`grid grid-cols-3 px-6 py-3.5 items-center ${
                    i % 2 === 0 ? '' : 'bg-muted/20'
                  } ${i < COMPARISON_ROWS.length - 1 ? 'border-b border-border/50' : ''}`}
                >
                  <p className="text-[13px] text-foreground">{row.feature}</p>
                  <div className="flex justify-center">
                    {row.free ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex justify-center">
                    {row.premium ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground/30" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Conversion section ─────────────────────────────────────────────────────────

function ConversionSection() {
  return (
    <section className="py-20 px-6 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <Eyebrow>Why upgrade</Eyebrow>
        <SectionHeading className="text-2xl md:text-3xl mb-6">
          Free shows the numbers.<br className="hidden sm:block" /> Premium helps you act on them.
        </SectionHeading>
        <p className="text-muted-foreground leading-relaxed text-[15px]">
          Northline Free gives you a place to upload files and see the basics. Northline Premium
          unlocks the sections that help owners spot profit leaks, control labour, and understand
          what needs attention this week. If you are using Northline to make real operating
          decisions, Premium is where the product becomes most valuable.
        </p>
      </div>
    </section>
  )
}

// ── What Premium unlocks ───────────────────────────────────────────────────────

const UNLOCK_ITEMS = [
  {
    icon: BarChart3,
    name: 'Full owner summary',
    description:
      'A weekly view of what improved, what needs attention, and what to focus on next — built from your actual data.',
  },
  {
    icon: PieChart,
    name: 'Prime cost visibility',
    description:
      'See food cost and labour cost combined as a percentage of revenue, tracked over time and benchmarked against the 60% target.',
  },
  {
    icon: TrendingUp,
    name: 'Margin leak analysis',
    description:
      'Identify which channels, categories, and items are quietly eroding your margin — before they become a bigger problem.',
  },
  {
    icon: Users,
    name: 'Labour intelligence',
    description:
      'Track labour cost by outlet, compare it against revenue, and see where staffing pressure is building.',
  },
  {
    icon: Lightbulb,
    name: 'Better weekly decisions',
    description:
      'Alerts and action-focused insights that surface what matters, so your weekly review has a clear starting point.',
  },
]

function WhatPremiumUnlocks() {
  return (
    <section className="py-20 px-6 bg-muted/30 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Eyebrow>What changes with Premium</Eyebrow>
          <SectionHeading className="text-2xl md:text-3xl mb-4">
            The sections that make the weekly review count
          </SectionHeading>
          <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
            These five areas are unlocked with Premium. Each one is designed to surface a specific
            type of operational insight that is difficult to see without the full data view.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {UNLOCK_ITEMS.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/15">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[13px] font-semibold text-foreground mb-1.5">{item.name}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}

          {/* Filler card to balance the last row */}
          <div className="rounded-xl border border-dashed border-border p-5 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                More sections added as Northline grows. Premium users get priority access to new features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── ROI section ────────────────────────────────────────────────────────────────

function ROISection() {
  return (
    <section className="py-20 px-6 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <Eyebrow>The case for Premium</Eyebrow>
        <SectionHeading className="text-2xl md:text-3xl mb-6">
          Built to pay for itself in better decisions
        </SectionHeading>
        <div className="space-y-4 text-[15px] text-muted-foreground leading-relaxed">
          <p>
            Northline Premium is designed to help restaurant owners catch the kinds of issues that
            quietly erode performance: over-discounting, weak-margin menu items, rising labour
            pressure, and delivery channels that look stronger than they really are.
          </p>
          <p>
            If Premium helps you protect margin, tighten labour, or catch one meaningful issue
            earlier, it can justify itself very quickly.
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Contact Sales ──────────────────────────────────────────────────────────────

function ContactSalesSection({ orgId }: { orgId: string | null }) {
  return (
    <section id="contact" className="py-20 px-6 bg-muted/30 border-t border-border">
      <div className="max-w-2xl mx-auto text-center">
        <Eyebrow>Talk to us</Eyebrow>
        <SectionHeading className="text-2xl md:text-3xl mb-4">
          Need help choosing the right plan?
        </SectionHeading>
        <p className="text-muted-foreground leading-relaxed mb-8 text-[15px]">
          If you want to understand whether Premium is the right fit for your restaurant, our team
          can help. We'll review your setup and help you decide what makes sense for your operation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <PricingContactSalesButton orgId={orgId} />
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card text-foreground font-medium px-6 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            Start free first
          </Link>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-4">
          We'll review your setup and help you decide what makes sense for your operation.
        </p>
      </div>
    </section>
  )
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-2xl mx-auto text-center">
        {/* N-mark lockup */}
        <div className="flex items-center justify-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <NMark className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>

        <h2 className="font-marketing font-semibold tracking-tight text-3xl md:text-4xl mb-4">
          Know your numbers.<br className="hidden sm:block" /> Stay on course.
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8 text-[15px] max-w-lg mx-auto">
          Start with Free, or unlock the full Northline operating view with Premium.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-medium px-6 py-2.5 text-sm hover:bg-primary/90 transition-colors"
          >
            Start free trial
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="#contact"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card text-foreground font-medium px-6 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            Book a demo
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground/60">
          No contract required. Upgrade or downgrade at any time.
        </p>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 opacity-40">
          <div className="h-4 w-4 rounded bg-foreground flex items-center justify-center">
            <NMark className="h-2.5 w-2.5 text-background" />
          </div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase">Northline</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
          <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Sign up
          </Link>
        </div>
        <p className="text-xs text-muted-foreground/60">Know your numbers. Stay on course.</p>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let orgId: string | null = null
  if (user) {
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    orgId = membership?.organization_id ?? null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <PricingCards />
        <ComparisonTable />
        <ConversionSection />
        <WhatPremiumUnlocks />
        <ROISection />
        <ContactSalesSection orgId={orgId} />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
