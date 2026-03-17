'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DATASET_FIELDS, type DatasetType } from '@/lib/upload/schemas'

// ── Type coercion ────────────────────────────────────────────────────────────

function coerceRow(
  rawRow: Record<string, string>,
  mapping: Record<string, string>,
  datasetType: DatasetType
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const field of DATASET_FIELDS[datasetType]) {
    const col = mapping[field.key]
    if (!col) continue
    const raw = (rawRow[col] ?? '').trim()
    if (!raw) continue

    switch (field.type) {
      case 'number': {
        const n = parseFloat(raw.replace(/[,£$€¥\s]/g, ''))
        if (!isNaN(n)) result[field.key] = n
        break
      }
      case 'boolean': {
        result[field.key] = ['true', 'yes', '1', 'y'].includes(raw.toLowerCase())
        break
      }
      case 'date': {
        const d = new Date(raw)
        if (!isNaN(d.getTime())) result[field.key] = d.toISOString().split('T')[0]
        break
      }
      default:
        result[field.key] = raw
    }
  }

  return result
}

// ── Server actions ───────────────────────────────────────────────────────────

export interface SaveUploadResult {
  error?: string
  imported?: number
  failed?: number
  uploadId?: string
}

const BATCH_SIZE = 500
const MAX_ROWS = 10_000

export async function saveUpload(params: {
  fileName: string
  fileType: 'csv' | 'xlsx'
  fileSizeBytes: number
  targetTable: DatasetType
  mapping: Record<string, string>
  rows: Record<string, string>[]
  /** Sheet name — set for multi-sheet workbook imports */
  sheetName?: string
  /** Pass the upload record ID from a previous sheet to reuse the same upload record */
  existingUploadId?: string
}): Promise<SaveUploadResult> {
  const { fileName, fileType, fileSizeBytes, targetTable, mapping, rows, sheetName, existingUploadId } = params

  if (rows.length > MAX_ROWS) {
    return { error: `File has ${rows.length.toLocaleString()} rows. Maximum is ${MAX_ROWS.toLocaleString()} per upload.` }
  }

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

  if (!membership) return { error: 'No organization found. Please complete onboarding.' }

  const orgId = membership.organization_id

  // ── Create or reuse upload record ───────────────────────────────────────────
  let uploadId: string

  if (existingUploadId) {
    // Multi-sheet workbook: reuse the upload record created for the first sheet
    uploadId = existingUploadId
  } else {
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        organization_id: orgId,
        uploaded_by: user.id,
        file_name: fileName,
        storage_path: `${orgId}/${Date.now()}_${fileName}`,
        file_type: fileType,
        file_size_bytes: fileSizeBytes,
        status: 'processing',
      })
      .select('id')
      .single()

    if (uploadError || !upload) return { error: 'Could not create upload record.' }
    uploadId = upload.id
  }

  // ── Create import job for this sheet ────────────────────────────────────────
  const { data: job, error: jobError } = await supabase
    .from('import_jobs')
    .insert({
      organization_id: orgId,
      upload_id: uploadId,
      target_table: targetTable,
      rows_total: rows.length,
      status: 'running',
      ...(sheetName ? { sheet_name: sheetName } : {}),
    })
    .select('id')
    .single()

  if (jobError || !job) return { error: 'Could not create import job.' }

  // ── Coerce rows and insert in batches ────────────────────────────────────────
  const coercedRows = rows.map((row) => ({
    ...coerceRow(row, mapping, targetTable),
    organization_id: orgId,
    source_upload_id: uploadId,
  }))

  let imported = 0
  let failed = 0
  const errorMessages: string[] = []

  for (let i = 0; i < coercedRows.length; i += BATCH_SIZE) {
    const batch = coercedRows.slice(i, i + BATCH_SIZE)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any).from(targetTable).insert(batch)
    if (insertError) {
      failed += batch.length
      if (!errorMessages.includes(insertError.message)) {
        errorMessages.push(insertError.message)
      }
    } else {
      imported += batch.length
    }
  }

  const finalStatus = failed === rows.length ? 'error' : 'done'

  // ── Update records ───────────────────────────────────────────────────────────
  await Promise.all([
    // Only update the upload status if this is the first (or only) sheet
    ...(!existingUploadId
      ? [supabase.from('uploads').update({ status: finalStatus }).eq('id', uploadId)]
      : []),
    supabase.from('import_jobs').update({
      status: finalStatus,
      rows_imported: imported,
      rows_failed: failed,
      error_log: errorMessages.length ? { errors: errorMessages } : null,
    }).eq('id', job.id),
  ])

  if (failed === rows.length) {
    return { error: `Import failed: ${errorMessages[0] ?? 'unknown error'}` }
  }

  return { imported, failed, uploadId }
}

/**
 * Finalise a multi-sheet workbook upload record after all sheets have been
 * imported — sets the upload status based on whether any job succeeded.
 */
export async function finaliseWorkbookUpload(
  uploadId: string,
  anySucceeded: boolean
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('uploads')
    .update({ status: anySucceeded ? 'done' : 'error' })
    .eq('id', uploadId)
}
