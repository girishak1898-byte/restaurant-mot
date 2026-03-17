import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { UploadsTable, type UploadRow } from './_components/UploadsTable'

export default async function UploadsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  const orgId = membership.organization_id

  // ── Primary query: includes sheet_name (requires migration 0007 applied) ──
  const FULL_SELECT = `
    id,
    file_name,
    file_type,
    file_size_bytes,
    status,
    created_at,
    import_jobs (
      target_table,
      sheet_name,
      rows_total,
      rows_imported,
      rows_failed,
      status,
      error_log
    )
  `

  // ── Fallback query: omits sheet_name for pre-migration databases ──
  const COMPAT_SELECT = `
    id,
    file_name,
    file_type,
    file_size_bytes,
    status,
    created_at,
    import_jobs (
      target_table,
      rows_total,
      rows_imported,
      rows_failed,
      status,
      error_log
    )
  `

  let { data: uploads, error: uploadsError } = await supabase
    .from('uploads')
    .select(FULL_SELECT)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  // If the schema cache doesn't know about sheet_name yet (migration 0007 not applied),
  // fall back to a compatible query so existing uploads still show.
  if (uploadsError?.message?.includes('sheet_name')) {
    console.error('[uploads page] sheet_name not in schema cache — running compat query. Apply migration 0007.')
    const compat = await supabase
      .from('uploads')
      .select(COMPAT_SELECT)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    uploads = compat.data as typeof uploads
    uploadsError = compat.error
  }

  if (uploadsError) {
    console.error('[uploads page] query failed:', uploadsError.message)
  }

  const rows: UploadRow[] = (uploads ?? []).map((u) => ({
    ...u,
    import_jobs: (Array.isArray(u.import_jobs) ? u.import_jobs : []).map((j) => ({
      target_table: j.target_table,
      sheet_name: ('sheet_name' in j ? j.sheet_name : null) as string | null,
      rows_total: j.rows_total,
      rows_imported: j.rows_imported,
      rows_failed: j.rows_failed,
      status: j.status,
      error_log: j.error_log as { errors?: string[] } | null,
    })),
  }))

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-heading">My files</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {rows.length === 0
              ? 'No files uploaded yet.'
              : `${rows.length} file${rows.length === 1 ? '' : 's'} uploaded`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/upload">
            <Upload className="h-3.5 w-3.5" />
            Import data
          </Link>
        </Button>
      </div>

      {uploadsError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Could not load your files: {uploadsError.message}. If this persists, contact support.
          </AlertDescription>
        </Alert>
      )}

      <UploadsTable initialRows={rows} />
    </div>
  )
}
