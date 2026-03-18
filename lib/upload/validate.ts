import { DATASET_FIELDS, type DatasetType } from './schemas'

export interface RowError {
  row: number   // 1-indexed, accounting for header row
  errors: string[]
}

export interface ValidationResult {
  validCount: number
  invalidCount: number
  errors: RowError[]   // capped at 50 for display
  /** Every invalid row number — use this for filtering, NOT errors (which is capped). */
  invalidRowNums: Set<number>
  isValid: boolean
}

function isValidDate(value: string): boolean {
  // Try native parsing first (ISO, US M/D/YYYY, etc.).
  // If that fails, try DD/MM/YYYY (UK/EU) → YYYY-MM-DD, matching server-side coerceRow.
  if (!isNaN(new Date(value).getTime())) return true
  const parts = value.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (parts) {
    const [, dd, mm, y] = parts
    const year = y.length === 2 ? (parseInt(y) >= 50 ? `19${y}` : `20${y}`) : y
    return !isNaN(new Date(`${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`).getTime())
  }
  return false
}

function isValidNumber(value: string): boolean {
  // Strip common currency symbols and thousands separators before testing
  const cleaned = value.replace(/[,£$€¥\s]/g, '')
  return cleaned !== '' && !isNaN(parseFloat(cleaned))
}

export function validateRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>,   // fieldKey → column name in the file
  datasetType: DatasetType
): ValidationResult {
  const fields = DATASET_FIELDS[datasetType]
  const allErrors: RowError[] = []

  rows.forEach((row, i) => {
    const rowErrors: string[] = []

    for (const field of fields) {
      const col = mapping[field.key]
      const value = col ? (row[col] ?? '').trim() : ''

      if (field.required && (!col || value === '')) {
        rowErrors.push(`"${field.label}" is required`)
        continue
      }

      if (!value) continue // optional + empty → fine

      if (field.type === 'date' && !isValidDate(value)) {
        rowErrors.push(`"${field.label}": "${value}" is not a recognised date`)
      }
      if (field.type === 'number' && !isValidNumber(value)) {
        rowErrors.push(`"${field.label}": "${value}" is not a number`)
      }
    }

    if (rowErrors.length > 0) {
      allErrors.push({ row: i + 2, errors: rowErrors })
    }
  })

  const invalidRowNums = new Set(allErrors.map((e) => e.row))

  return {
    validCount: rows.length - allErrors.length,
    invalidCount: allErrors.length,
    errors: allErrors.slice(0, 50),   // show at most 50 in the UI
    invalidRowNums,
    isValid: allErrors.length === 0,
  }
}
