'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X, LogIn } from 'lucide-react'
import { ContactSalesModal } from '@/components/contact-sales-modal'

interface Props {
  orgId: string | null
}

export function PricingContactSalesButton({ orgId }: Props) {
  // Logged-in user with an org — use the existing modal
  if (orgId) {
    return (
      <ContactSalesModal
        orgId={orgId}
        trigger={
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-medium px-6 py-2.5 text-sm hover:bg-primary/90 transition-colors cursor-pointer">
            Contact Sales
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        }
      />
    )
  }

  // Guest — show a lightweight sign-in prompt modal
  return <GuestContactModal />
}

function GuestContactModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-medium px-6 py-2.5 text-sm hover:bg-primary/90 transition-colors"
      >
        Contact Sales
        <ArrowRight className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-7 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <LogIn className="h-5 w-5 text-primary" />
              </div>

              <h2 className="text-[15px] font-semibold text-foreground mb-2">
                Sign in to contact sales
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Create a free account or sign in to send a message to our sales team. It only takes
                a minute.
              </p>

              <div className="flex flex-col gap-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
