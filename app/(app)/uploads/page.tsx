import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
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

  // Fetch uploads joined with their import job (one-to-one via upload_id)
  const { data: uploads } = await supabase
    .from('uploads')
    .select(`
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
    `)
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })

  // Each upload has at most one import_job — unwrap the array Supabase returns
  const rows: UploadRow[] = (uploads ?? []).map((u) => ({
    ...u,
    import_jobs: Array.isArray(u.import_jobs)
      ? (u.import_jobs[0] ?? null)
      : (u.import_jobs ?? null),
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

      <UploadsTable initialRows={rows} />
    </div>
  )
}
