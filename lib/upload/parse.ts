import * as XLSX from 'xlsx'

export interface ParseResult {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
  previewRows: Record<string, string>[] // first 5 rows for the UI
}

export async function parseFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()

  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,  // parse dates as JS Date objects
    cellText: false,
  })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('No sheets found in this file.')

  const sheet = workbook.Sheets[sheetName]

  // Convert to array of plain objects; raw: false gives us formatted strings
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })

  if (rawRows.length === 0) {
    throw new Error('This file appears to be empty or has no data rows.')
  }

  const headers = Object.keys(rawRows[0])
  if (headers.length === 0) {
    throw new Error('Could not detect any column headers in this file.')
  }

  // Normalise every cell to a trimmed string
  const rows: Record<string, string>[] = rawRows.map((row) => {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      out[k] = v == null ? '' : String(v).trim()
    }
    return out
  })

  return {
    headers,
    rows,
    totalRows: rows.length,
    previewRows: rows.slice(0, 5),
  }
}
