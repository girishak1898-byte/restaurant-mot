import { DATASET_FIELDS, type DatasetType } from './schemas'

export interface RowError {
  row: number   // 1-indexed, accounting for header row
  errors: string[]
}

export interface ValidationResult {
  validCount: number
  invalidCount: number
  errors: RowError[]   // capped at 50 for display
  isValid: boolean
}

function isValidDate(value: string): boolean {
  // Normalise DD/MM/YYYY and DD-MM-YYYY (UK/EU) → YYYY-MM-DD before parsing,
  // matching the server-side coerceRow behaviour.
  let normalised = value
  const parts = value.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (parts) {
    const [, d, m, y] = parts
    const year = y.length === 2 ? (parseInt(y) >= 50 ? `19${y}` : `20${y}`) : y
    normalised = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return !isNaN(new Date(normalised).getTime())
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

  return {
    validCount: rows.length - allErrors.length,
    invalidCount: allErrors.length,
    errors: allErrors.slice(0, 50),   // show at most 50 in the UI
    isValid: allErrors.length === 0,
  }
}
