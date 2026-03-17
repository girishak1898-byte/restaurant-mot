import Link from 'next/link'
import { Lock } from 'lucide-react'
import { ContactSalesModal } from './contact-sales-modal'

interface PremiumGateProps {
  children: React.ReactNode
  isPremium: boolean
  headline: string
  body: string
  orgId: string
  minHeight?: string
}

export function PremiumGate({
  children,
  isPremium,
  headline,
  body,
  orgId,
  minHeight = '220px',
}: PremiumGateProps) {
  if (isPremium) return <>{children}</>

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ minHeight }}>
      {/* Blurred content */}
      <div
        className="blur-sm pointer-events-none select-none opacity-40"
        aria-hidden="true"
        style={{ minHeight }}
      >
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 z-10">
        <div className="flex flex-col items-center text-center px-8 py-8 max-w-sm">
          {/* Icon */}
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-sm">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Copy */}
          <p className="text-[14px] font-semibold text-foreground tracking-tight mb-2">
            {headline}
          </p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-[260px]">
            {body}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View pricing
            </Link>
            <ContactSalesModal orgId={orgId} />
          </div>
        </div>
      </div>
    </div>
  )
}
