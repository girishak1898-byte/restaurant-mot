'use client'

import { useState, useTransition } from 'react'
import { approveUpgradeRequest, rejectUpgradeRequest } from '@/lib/actions/admin'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'

interface RequestActionsProps {
  requestId: string
}

export function RequestActions({ requestId }: RequestActionsProps) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleApprove() {
    startTransition(async () => {
      const result = await approveUpgradeRequest(requestId)
      if (!result.error) {
        setDone(true)
        router.refresh()
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectUpgradeRequest(requestId)
      if (!result.error) {
        setDone(true)
        router.refresh()
      }
    })
  }

  if (done) {
    return <span className="text-xs text-muted-foreground">Done</span>
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approve
      </button>
      <button
        onClick={handleReject}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
      >
        <XCircle className="h-3.5 w-3.5" />
        Reject
      </button>
    </div>
  )
}
