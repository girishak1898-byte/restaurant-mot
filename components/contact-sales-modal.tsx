'use client'

import { useState, useTransition } from 'react'
import { PhoneCall, CheckCircle2, X } from 'lucide-react'
import { submitUpgradeRequest } from '@/lib/actions/upgrade'

interface ContactSalesModalProps {
  orgId: string
  trigger?: React.ReactNode
}

export function ContactSalesModal({ orgId, trigger }: ContactSalesModalProps) {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    setSubmitted(false)
    setError(null)
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitUpgradeRequest(orgId)
      if (result.error) {
        // "already pending" is a soft success state — request exists
        if (result.error.includes('already pending')) {
          setSubmitted(true)
        } else {
          setError(result.error)
        }
      } else {
        setSubmitted(true)
      }
    })
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={handleOpen}
        className={
          trigger
            ? ''
            : 'inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors'
        }
      >
        {trigger ?? (
          <>
            <PhoneCall className="h-3.5 w-3.5" />
            Contact Sales
          </>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          {/* Modal */}
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-7 text-center">
              {submitted ? (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h2 className="text-[15px] font-semibold text-foreground mb-2">Request sent</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A request has been sent to the sales team. We'll be in touch shortly to discuss
                    upgrading your account to Premium.
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                    <PhoneCall className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-[15px] font-semibold text-foreground mb-2">
                    Talk to our sales team
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    We'll reach out to walk you through Premium, answer your questions, and get you
                    set up.
                  </p>

                  {error && (
                    <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleSubmit}
                      disabled={isPending}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {isPending ? 'Sending…' : 'Send request'}
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
