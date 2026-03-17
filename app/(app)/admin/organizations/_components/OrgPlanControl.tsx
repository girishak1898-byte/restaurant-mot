'use client'

import { useState, useTransition } from 'react'
import { setOrganizationPlan } from '@/lib/actions/admin'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

interface OrgPlanControlProps {
  orgId: string
  currentPlan: string
  orgName: string
}

export function OrgPlanControl({ orgId, currentPlan, orgName }: OrgPlanControlProps) {
  const [plan, setPlan] = useState(currentPlan)
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleChange(newPlan: 'free' | 'premium') {
    if (newPlan === plan || isPending) return
    // Downgrading to free requires confirmation
    if (newPlan === 'free' && plan === 'premium') {
      setConfirming(true)
      return
    }
    applyChange(newPlan)
  }

  function applyChange(newPlan: 'free' | 'premium') {
    setConfirming(false)
    startTransition(async () => {
      const result = await setOrganizationPlan(orgId, newPlan)
      if (!result.error) {
        setPlan(newPlan)
        router.refresh()
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
        <span className="text-amber-800 font-medium">Downgrade {orgName}?</span>
        <button
          onClick={() => applyChange('free')}
          className="ml-1 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
        >
          Yes, downgrade
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    )
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
