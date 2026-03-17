'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface DeleteUploadResult {
  error?: string
  success?: boolean
}

export async function deleteUpload(uploadId: string): Promise<DeleteUploadResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) return { error: 'No organisation found.' }

  // Only owners and admins can delete
  if (!['owner', 'admin'].includes(membership.role)) {
    return { error: 'Only owners and admins can delete files.' }
  }

  const orgId = membership.organization_id

  // Verify the upload belongs to this org (defence-in-depth on top of RLS)
  const { data: upload } = await supabase
    .from('uploads')
    .select('id')
    .eq('id', uploadId)
    .eq('organization_id', orgId)
    .single()

  if (!upload) return { error: 'File not found or access denied.' }

  // ── Gather ALL import jobs for this upload (multi-sheet workbooks have many) ──
  const { data: jobs } = await supabase
    .from('import_jobs')
    .select('target_table')
    .eq('upload_id', uploadId)
    .eq('organization_id', orgId)

  // Delete imported data rows from every target table referenced by this upload.
  // Deduplicate tables in case the same table appears in multiple jobs.
  if (jobs && jobs.length > 0) {
    const tables = [...new Set(jobs.map((j) => j.target_table).filter(Boolean))]
    await Promise.all(
      tables.map((table) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from(table)
          .delete()
          .eq('source_upload_id', uploadId)
          .eq('organization_id', orgId)
      )
    )
    // Errors are intentionally swallowed — data rows may already be gone,
    // and the upload record delete (which cascades to import_jobs) is the critical step.
  }

  // Delete the upload record — cascades to import_jobs automatically via FK
  const { error: deleteError } = await supabase
    .from('uploads')
    .delete()
    .eq('id', uploadId)
    .eq('organization_id', orgId)

  if (deleteError) {
    return { error: 'Could not delete the file. Please try again.' }
  }

  return { success: true }
}
