'use client'

import { useState, useTransition } from 'react'
import { approveUpgradeRequest, rejectUpgradeRequest } from '@/lib/actions/admin'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, CheckCheck, X, AlertCircle } from 'lucide-react'

interface RequestActionsProps {
  requestId: string
}

type State =
  | { kind: 'idle' }
  | { kind: 'confirming-reject' }
  | { kind: 'done'; outcome: 'approved' | 'rejected' }
  | { kind: 'error'; message: string }

export function RequestActions({ requestId }: RequestActionsProps) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleApprove() {
    startTransition(async () => {
      const result = await approveUpgradeRequest(requestId)
      if (result.error) {
        setState({ kind: 'error', message: result.error })
      } else {
        setState({ kind: 'done', outcome: 'approved' })
        router.refresh()
      }
    })
  }

  function handleRejectConfirm() {
    startTransition(async () => {
      const result = await rejectUpgradeRequest(requestId)
      if (result.error) {
        setState({ kind: 'error', message: result.error })
      } else {
        setState({ kind: 'done', outcome: 'rejected' })
        router.refresh()
      }
    })
  }

  if (state.kind === 'done') {
    return state.outcome === 'approved' ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <CheckCheck className="h-3.5 w-3.5" />
        Approved
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <X className="h-3.5 w-3.5" />
        Rejected
      </span>
    )
  }

  if (state.kind === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {state.message}
      </span>
    )
  }

  if (state.kind === 'confirming-reject') {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Reject this request?</span>
        <button
          onClick={handleRejectConfirm}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-60"
        >
          {isPending ? '…' : 'Yes, reject'}
        </button>
        <button
          onClick={() => setState({ kind: 'idle' })}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {isPending ? '…' : 'Approve'}
      </button>
      <button
        onClick={() => setState({ kind: 'confirming-reject' })}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
      >
        <XCircle className="h-3.5 w-3.5" />
        Reject
      </button>
    </div>
  )
}
