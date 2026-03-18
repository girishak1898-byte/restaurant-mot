'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DATASET_FIELDS, type DatasetType } from '@/lib/upload/schemas'

// ── Shared auth helper ────────────────────────────────────────────────────────

async function getOrgId(): Promise<{ orgId: string; userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) return { error: 'No organization found. Please complete onboarding.' }
  return { orgId: membership.organization_id, userId: user.id }
}

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
        // Try native Date parsing first (handles ISO, US M/D/YYYY, and many other formats).
        // If that fails, try DD/MM/YYYY (UK/EU) → YYYY-MM-DD conversion.
        let parsed = new Date(raw)
        if (isNaN(parsed.getTime())) {
          const parts = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
          if (parts) {
            const [, dd, mm, y] = parts
            const year = y.length === 2 ? (parseInt(y) >= 50 ? `19${y}` : `20${y}`) : y
            parsed = new Date(`${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`)
          }
        }
        if (!isNaN(parsed.getTime())) result[field.key] = parsed.toISOString().split('T')[0]
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
  /** Present when a sheet-level error occurs — callers can show this in the UI */
  sheetName?: string
  datasetType?: string
}

const BATCH_SIZE = 500
const MAX_ROWS = 10_000

/**
 * Create a single upload record for a multi-sheet workbook.
 * Always returns a structured result — never throws.
 */
export async function createWorkbookUpload(params: {
  fileName: string
  fileType: 'csv' | 'xlsx'
  fileSizeBytes: number
}): Promise<SaveUploadResult> {
  const { fileName, fileType, fileSizeBytes } = params
  try {
    const auth = await getOrgId()
    if ('error' in auth) return { error: auth.error }
    const { orgId, userId } = auth

    const supabase = await createClient()
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        organization_id: orgId,
        uploaded_by: userId,
        file_name: fileName,
        storage_path: `${orgId}/${Date.now()}_${fileName}`,
        file_type: fileType,
        file_size_bytes: fileSizeBytes,
        status: 'processing',
      })
      .select('id')
      .single()

    if (uploadError || !upload) {
      console.error('[createWorkbookUpload] insert error:', uploadError)
      return { error: uploadError?.message ?? 'Could not create upload record.' }
    }
    return { uploadId: upload.id }
  } catch (err) {
    // Re-throw Next.js navigation signals — everything else becomes a structured error
    if (isNavigationError(err)) throw err
    console.error('[createWorkbookUpload] unexpected error:', err)
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    return { error: `Could not start upload: ${message}` }
  }
}

export async function saveUpload(params: {
  fileName: string
  fileType: 'csv' | 'xlsx'
  fileSizeBytes: number
  targetTable: DatasetType
  mapping: Record<string, string>
  rows: Record<string, string>[]
  /** Actual total rows in the source sheet — used for import_jobs.rows_total */
  rowsTotal?: number
  /** Sheet name — set for multi-sheet workbook imports */
  sheetName?: string
  /** Pass the upload record ID created by createWorkbookUpload to skip creating a new one */
  existingUploadId?: string
}): Promise<SaveUploadResult> {
  const { fileName, fileType, fileSizeBytes, targetTable, mapping, rows, rowsTotal, sheetName, existingUploadId } = params

  try {
    if (rows.length > MAX_ROWS) {
      return { error: `File has ${rows.length.toLocaleString()} rows. Maximum is ${MAX_ROWS.toLocaleString()} per upload.` }
    }

    const auth = await getOrgId()
    if ('error' in auth) return { error: auth.error }
    const { orgId, userId } = auth

    const supabase = await createClient()

    // ── Create or reuse upload record ──────────────────────────────────────────
    let uploadId: string

    if (existingUploadId) {
      uploadId = existingUploadId
    } else {
      const { data: upload, error: uploadError } = await supabase
        .from('uploads')
        .insert({
          organization_id: orgId,
          uploaded_by: userId,
          file_name: fileName,
          storage_path: `${orgId}/${Date.now()}_${fileName}`,
          file_type: fileType,
          file_size_bytes: fileSizeBytes,
          status: 'processing',
        })
        .select('id')
        .single()

      if (uploadError || !upload) {
        console.error('[saveUpload] upload insert error:', uploadError)
        return { error: uploadError?.message ?? 'Could not create upload record.' }
      }
      uploadId = upload.id
    }

    // ── Create import job for this sheet ──────────────────────────────────────
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        organization_id: orgId,
        upload_id: uploadId,
        target_table: targetTable,
        rows_total: rowsTotal ?? rows.length,
        status: 'running',
        ...(sheetName ? { sheet_name: sheetName } : {}),
      })
      .select('id')
      .single()

    if (jobError || !job) {
      console.error('[saveUpload] import_job insert error:', jobError)
      return {
        error: jobError?.message ?? 'Could not create import job.',
        uploadId,
        sheetName,
        datasetType: targetTable,
      }
    }

    // ── Coerce rows and insert in batches ─────────────────────────────────────
    console.log('[saveUpload] mapping for', targetTable, ':', JSON.stringify(mapping))
    if (rows.length > 0) {
      const sampleKeys = Object.keys(rows[0])
      console.log('[saveUpload] sheet headers:', JSON.stringify(sampleKeys))
    }

    const coercedRows = rows.map((row) => ({
      ...coerceRow(row, mapping, targetTable),
      organization_id: orgId,
      source_upload_id: uploadId,
    }))

    if (coercedRows.length > 0) {
      console.log('[saveUpload] first coerced row:', JSON.stringify(coercedRows[0]))
    }

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
          console.error('[saveUpload] batch insert error:', insertError.message, { targetTable, sheetName })
          errorMessages.push(insertError.message)
        }
      } else {
        imported += batch.length
      }
    }

    // Zero valid rows is not an error — mark done with 0 imported
    const allFailed = rows.length > 0 && failed === rows.length
    const finalStatus = allFailed ? 'error' : 'done'

    // ── Update records ────────────────────────────────────────────────────────
    await Promise.all([
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

    if (allFailed) {
      return {
        error: `All rows failed: ${errorMessages[0] ?? 'unknown error'}`,
        uploadId,
        sheetName,
        datasetType: targetTable,
      }
    }

    return { imported, failed, uploadId }
  } catch (err) {
    if (isNavigationError(err)) throw err
    console.error('[saveUpload] unexpected error:', err, { targetTable, sheetName })
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    return {
      error: `Import failed: ${message}`,
      uploadId: existingUploadId,
      sheetName,
      datasetType: targetTable,
    }
  }
}

/**
 * Finalise a multi-sheet workbook upload record after all sheets have been
 * imported — sets the upload status based on whether any job succeeded.
 * Always returns void; logs but swallows errors (non-critical).
 */
export async function finaliseWorkbookUpload(
  uploadId: string,
  anySucceeded: boolean
): Promise<void> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('uploads')
      .update({ status: anySucceeded ? 'done' : 'error' })
      .eq('id', uploadId)
    if (error) console.error('[finaliseWorkbookUpload] update error:', error)
  } catch (err) {
    if (isNavigationError(err)) throw err
    console.error('[finaliseWorkbookUpload] unexpected error:', err)
    // Non-fatal — the import data is already saved
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True for Next.js redirect() and notFound() signals — must be re-thrown. */
function isNavigationError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  if (!('digest' in err)) return false
  const digest = String((err as { digest: unknown }).digest)
  return digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND'
}
