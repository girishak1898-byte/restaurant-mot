'use client'

import { useState, useTransition } from 'react'
import { setOrganizationPlan } from '@/lib/actions/admin'
import { useRouter } from 'next/navigation'

interface OrgPlanControlProps {
  orgId: string
  currentPlan: string
  orgName: string
}

export function OrgPlanControl({ orgId, currentPlan, orgName }: OrgPlanControlProps) {
  const [plan, setPlan] = useState(currentPlan)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleChange(newPlan: 'free' | 'premium') {
    if (newPlan === plan) return
    startTransition(async () => {
      const result = await setOrganizationPlan(orgId, newPlan)
      if (!result.error) {
        setPlan(newPlan)
        router.refresh()
      }
    })
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-border overflow-hidden text-xs font-medium">
      <button
        onClick={() => handleChange('free')}
        disabled={isPending}
        className={`px-3 py-1.5 transition-colors ${
          plan === 'free'
            ? 'bg-foreground text-background'
            : 'bg-background text-muted-foreground hover:bg-muted'
        }`}
      >
        Free
      </button>
      <button
        onClick={() => handleChange('premium')}
        disabled={isPending}
        className={`px-3 py-1.5 transition-colors border-l border-border ${
          plan === 'premium'
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-muted-foreground hover:bg-muted'
        }`}
      >
        {isPending ? '…' : 'Premium'}
      </button>
    </div>
  )
}
