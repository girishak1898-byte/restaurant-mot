'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Clock, Loader2, FileText, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteUpload } from '@/lib/actions/uploads-management'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadRow {
  id: string
  file_name: string
  file_type: string
  file_size_bytes: number | null
  status: string
  created_at: string
  import_jobs: {
    target_table: string
    rows_total: number
    rows_imported: number
    rows_failed: number
    status: string
    error_log: { errors?: string[] } | null
  } | null
}

// ── Labels ────────────────────────────────────────────────────────────────────

const DATASET_LABELS: Record<string, string> = {
  restaurant_sales: 'Sales data',
  restaurant_menu_items: 'Menu items',
  restaurant_labour_shifts: 'Labour shifts',
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  done: {
    label: 'Imported',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: 'text-emerald-700 bg-emerald-50/60 border-emerald-200/70',
  },
  processing: {
    label: 'Processing',
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    className: 'text-primary bg-primary/8 border-primary/20',
  },
  pending: {
    label: 'Pending',
    icon: <Clock className="h-3.5 w-3.5" />,
    className: 'text-muted-foreground bg-muted/50 border-border',
  },
  error: {
    label: 'Failed',
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: 'text-red-700 bg-red-50/60 border-red-200/70',
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded border', config.className)}>
      {config.icon}
      {config.label}
    </span>
  )
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm mb-4',
        type === 'success' && 'bg-green-50 border-green-200 text-green-800',
        type === 'error' && 'bg-red-50 border-red-200 text-red-800'
      )}
    >
      {type === 'success' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-current opacity-60 hover:opacity-100 text-lg leading-none">
        ×
      </button>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function UploadRow({
  row,
  onDeleted,
}: {
  row: UploadRow
  onDeleted: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  const job = row.import_jobs
  const datasetLabel = job ? (DATASET_LABELS[job.target_table] ?? job.target_table) : '—'
  const displayStatus = job?.status ?? row.status

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUpload(row.id)
      if (result.error) {
        onDeleted('__error__:' + result.error)
      } else {
        onDeleted(row.id)
      }
      setConfirming(false)
    })
  }

  return (
    <>
      <tr className="hover:bg-muted/30 border-b last:border-b-0">
        {/* Expand toggle */}
        <td className="py-3 pl-4 w-8">
          {job && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </td>

        {/* File name */}
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate max-w-[220px]" title={row.file_name}>
              {row.file_name}
            </span>
          </div>
        </td>

        {/* Dataset type */}
        <td className="py-3 pr-4 text-sm text-muted-foreground">{datasetLabel}</td>

        {/* Upload date */}
        <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(row.created_at)}
        </td>

        {/* Status */}
        <td className="py-3 pr-4">
          <StatusBadge status={displayStatus} />
        </td>

        {/* Rows imported / skipped */}
        <td className="py-3 pr-4 text-sm text-right">
          {job ? (
            <span>
              <span className="font-medium">{job.rows_imported.toLocaleString()}</span>
              {job.rows_failed > 0 && (
                <span className="text-muted-foreground"> / {job.rows_failed.toLocaleString()} skipped</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>

        {/* File size */}
        <td className="py-3 pr-4 text-sm text-muted-foreground text-right">
          {formatBytes(row.file_size_bytes)}
        </td>

        {/* Actions */}
        <td className="py-3 pr-4 text-right">
          {confirming ? (
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">Delete file and its data?</span>
              <button
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs font-medium text-red-600 hover:text-red-700 underline underline-offset-2 disabled:opacity-50"
              >
                {isPending ? 'Deleting…' : 'Delete file'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete this file and all its imported rows"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && job && (
        <tr className="bg-muted/20 border-b">
          <td />
          <td colSpan={7} className="py-3 pr-4 pl-10">
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Dataset type:</span>{' '}
                {DATASET_LABELS[job.target_table] ?? job.target_table}
              </p>
              <p>
                <span className="font-medium text-foreground">Total rows in file:</span>{' '}
                {job.rows_total.toLocaleString()}
              </p>
              <p>
                <span className="font-medium text-foreground">Rows imported successfully:</span>{' '}
                <span className="text-green-700">{job.rows_imported.toLocaleString()}</span>
              </p>
              {job.rows_failed > 0 && (
                <p>
                  <span className="font-medium text-foreground">Rows skipped:</span>{' '}
                  <span className="text-amber-700">{job.rows_failed.toLocaleString()}</span>
                </p>
              )}
              {job.error_log?.errors && job.error_log.errors.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-red-700">
                  <p className="font-medium mb-1">Import errors:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {job.error_log.errors.slice(0, 3).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main table component ───────────────────────────────────────────────────────

export function UploadsTable({ initialRows }: { initialRows: UploadRow[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  function handleDeleted(id: string) {
    if (id.startsWith('__error__:')) {
      setToast({ message: id.slice('__error__:'.length), type: 'error' })
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== id))
    setToast({ message: 'File deleted — all imported rows from this file have been removed.', type: 'success' })
    router.refresh() // revalidate server data so dashboard reflects deletion
  }

  const filtered = rows.filter((r) => {
    const table = r.import_jobs?.target_table ?? ''
    const status = r.import_jobs?.status ?? r.status
    if (typeFilter !== 'all' && table !== typeFilter) return false
    if (statusFilter !== 'all' && status !== statusFilter) return false
    return true
  })

  const uniqueTypes = Array.from(new Set(rows.map((r) => r.import_jobs?.target_table).filter(Boolean))) as string[]

  return (
    <div>
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* Filters */}
      {rows.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors hover:border-ring/50"
          >
            <option value="all">All data types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{DATASET_LABELS[t] ?? t}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors hover:border-ring/50"
          >
            <option value="all">All statuses</option>
            <option value="done">Imported</option>
            <option value="error">Failed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
          </select>

          {(typeFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => { setTypeFilter('all'); setStatusFilter('all') }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No files uploaded yet</p>
          <p className="text-xs mt-1">
            Go to{' '}
            <Link href="/upload" className="text-primary underline underline-offset-2">
              Import data
            </Link>{' '}
            to upload your first file.
          </p>
        </div>
      )}

      {/* Filtered empty state */}
      {rows.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No files match your filters.{' '}
          <button
            onClick={() => { setTypeFilter('all'); setStatusFilter('all') }}
            className="text-primary underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="w-8 pl-4" />
                <th className="py-3 pr-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">File name</th>
                <th className="py-3 pr-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Data type</th>
                <th className="py-3 pr-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">Uploaded</th>
                <th className="py-3 pr-4 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="py-3 pr-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Rows</th>
                <th className="py-3 pr-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Size</th>
                <th className="py-3 pr-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {filtered.map((row) => (
                <UploadRow key={row.id} row={row} onDeleted={handleDeleted} />
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
