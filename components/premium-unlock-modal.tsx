'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { markNotificationRead } from '@/lib/actions/admin'

interface PremiumUnlockModalProps {
  /** IDs of unread plan_approved notifications — presence triggers the modal */
  notificationIds: string[]
}

const PARTICLES: { x: string; y: string; delay: string; size: string }[] = [
  { x: '0px',    y: '-38px', delay: '0ms',   size: '4px' },
  { x: '27px',   y: '-27px', delay: '40ms',  size: '3px' },
  { x: '38px',   y: '0px',   delay: '80ms',  size: '4px' },
  { x: '27px',   y: '27px',  delay: '20ms',  size: '3px' },
  { x: '0px',    y: '38px',  delay: '60ms',  size: '3px' },
  { x: '-27px',  y: '27px',  delay: '100ms', size: '4px' },
  { x: '-38px',  y: '0px',   delay: '40ms',  size: '3px' },
  { x: '-27px',  y: '-27px', delay: '80ms',  size: '3px' },
  { x: '16px',   y: '-52px', delay: '60ms',  size: '2.5px' },
  { x: '-16px',  y: '-52px', delay: '20ms',  size: '2.5px' },
]

export function PremiumUnlockModal({ notificationIds }: PremiumUnlockModalProps) {
  const [open, setOpen] = useState(() => {
    // Check sessionStorage first so remounts during the async mark-read
    // race condition can't reopen the modal.
    if (typeof window !== 'undefined' &&
        sessionStorage.getItem('premium_unlock_dismissed') === 'true') {
      return false
    }
    return notificationIds.length > 0
  })
  const [animate, setAnimate] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      // Trigger sparkle burst after modal paints
      const t = setTimeout(() => setAnimate(true), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  function dismiss(destination?: string) {
    setOpen(false)
    // Guard against remounts before the server action completes
    sessionStorage.setItem('premium_unlock_dismissed', 'true')
    // Mark all unlock notifications as read so server state catches up
    startTransition(() => {
      for (const id of notificationIds) {
        void markNotificationRead(id)
      }
    })
    if (destination) {
      router.push(destination)
    } else {
      // No navigation — refresh so the layout re-checks notification state
      router.refresh()
    }
  }

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes sparkle-burst {
          0%   { opacity: 0; transform: translate(0, 0) scale(0); }
          25%  { opacity: 1; transform: translate(calc(var(--sx) * 0.4), calc(var(--sy) * 0.4)) scale(1); }
          100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0.4); }
        }
        .sparkle-particle {
          animation: sparkle-burst 1.1s ease-out forwards;
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => dismiss()}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

        <div
          className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pb-8 pt-10 text-center">
            {/* Icon + sparkle burst */}
            <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center">
              {/* Sparkle particles */}
              {animate && PARTICLES.map((p, i) => (
                <span
                  key={i}
                  className="sparkle-particle absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                  style={{
                    width: p.size,
                    height: p.size,
                    animationDelay: p.delay,
                    // @ts-expect-error — CSS custom properties
                    '--sx': p.x,
                    '--sy': p.y,
                  }}
                />
              ))}

              {/* Icon container */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-sm">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>

            <h2 className="text-[18px] font-semibold tracking-tight text-foreground mb-3">
              Premium is now active
            </h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-8 max-w-[280px] mx-auto">
              Your organization now has access to full weekly insights, prime cost, margin leak
              analysis, and labour performance tools.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => dismiss('/dashboard')}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Explore Premium
              </button>
              <button
                onClick={() => dismiss('/dashboard')}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
