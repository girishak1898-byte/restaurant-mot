import * as XLSX from 'xlsx'
import type { DatasetType } from './schemas'

// ── Sheet detection ───────────────────────────────────────────────────────────

export type SheetDetectedType = 'sales' | 'menu' | 'labour' | 'purchases' | 'inventory' | 'waste' | 'skip'
export type Confidence = 'high' | 'medium' | 'low'

export interface SheetInspection {
  name: string
  rowCount: number
  headers: string[]
  previewRows: Record<string, string>[]
  detectedType: SheetDetectedType | null
  /** Mapped to the Northline DatasetType when detectedType is a data type */
  datasetType: DatasetType | null
  confidence: Confidence
  /** True for overview/info/notes sheets — skipped by default in the UI */
  defaultSkip: boolean
}

// ── Name signature lists ──────────────────────────────────────────────────────

const SKIP_NAMES = [
  'overview', 'summary', 'readme', 'notes', 'instructions',
  'info', 'about', 'cover', 'contents', 'index', 'dashboard',
  'glossary', 'guide', 'help',
]
const SALES_NAMES = [
  'sales', 'revenue', 'orders', 'transactions', 'pos', 'receipts',
  'daily sales', 'weekly sales',
]
const MENU_NAMES = [
  'menu', 'food cost', 'foodcost', 'food costs', 'menu items',
  'items', 'products', 'recipes', 'menu & food costs',
]
const LABOUR_NAMES = [
  'labour', 'labor', 'shifts', 'staff', 'employees', 'workforce',
  'rota', 'schedule', 'labour shifts', 'labor shifts', 'payroll',
]
const PURCHASES_NAMES = [
  'purchases', 'purchase', 'suppliers', 'receiving', 'received',
  'orders', 'invoices', 'goods received', 'procurement', 'buying',
]
const INVENTORY_NAMES = [
  'inventory', 'stock', 'stock count', 'stocktake', 'counts',
  'stock take', 'inventory count', 'stock counts', 'variance',
]
const WASTE_NAMES = [
  'waste', 'shrinkage', 'adjustments', 'spoilage', 'wastage',
  'write off', 'write-off', 'losses',
]

// ── Header signature lists ────────────────────────────────────────────────────

const SALES_HEADERS = [
  'order id', 'orderid', 'order_id', 'timestamp', 'channel',
  'menu item', 'item_name', 'item name', 'qty', 'quantity',
  'gross sale', 'gross_amount', 'gross amount',
  'net sales', 'net_amount', 'net amount',
  'sale date', 'sale_date', 'discount', 'discount_amount',
]
const MENU_HEADERS = [
  'menu item', 'item_name', 'item name', 'supplier',
  'portion size', 'ingredient cost', 'waste', 'waste %',
  'food cost', 'food_cost_per_item', 'food cost per item',
  'menu price', 'base_price', 'base price',
  'gross margin', 'gross margin %', 'food cost %', 'effective unit cost',
]
const LABOUR_HEADERS = [
  'shift id', 'shiftid', 'employee', 'staff_name', 'staff name',
  'role', 'shift start', 'shift end',
  'paid hours', 'hours_worked', 'hours worked',
  'hourly_rate', 'hourly rate',
  'regular pay', 'ot pay', 'overtime',
  'labour_cost', 'labour cost', 'labor cost',
  'shift_date', 'shift date',
]
const PURCHASES_HEADERS = [
  'purchase_date', 'purchase date', 'supplier', 'invoice', 'invoice_reference',
  'unit_cost', 'unit cost', 'total_cost', 'total cost',
  'quantity received', 'qty received', 'unit_of_measure',
]
const INVENTORY_HEADERS = [
  'count_date', 'count date', 'opening_quantity', 'opening quantity',
  'closing_quantity', 'closing quantity', 'opening_value', 'closing_value',
  'stock value', 'count_reference', 'stocktake',
]
const WASTE_HEADERS = [
  'waste_date', 'waste date', 'quantity_wasted', 'quantity wasted',
  'waste_reason', 'waste reason', 'estimated_cost', 'shrinkage',
  'spoilage', 'write off',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Score how well a sheet name matches a list of keywords. */
function scoreSheetName(name: string, nameList: string[]): number {
  const norm = normalizeName(name)
  for (const n of nameList) {
    if (norm === n) return 3
    if (norm.includes(n) || n.includes(norm)) return 2
  }
  return 0
}

/** Score how many signature headers appear in the sheet's header row. */
function scoreHeaders(headers: string[], signatures: string[]): number {
  let score = 0
  const normHeaders = headers.map(normalizeHeader)
  for (const sig of signatures) {
    const normSig = normalizeHeader(sig)
    if (normHeaders.some((h) => h === normSig || h.includes(normSig) || normSig.includes(h))) {
      score++
    }
  }
  return score
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Inspect all sheets in an XLSX workbook buffer.
 * Returns one SheetInspection per sheet, sorted in workbook order.
 */
export function inspectWorkbook(buffer: ArrayBuffer): SheetInspection[] {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellText: false,
  })

  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })

    const rows: Record<string, string>[] = rawRows.map((row) => {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        out[k] = v == null ? '' : String(v).trim()
      }
      return out
    })

    const headers = rows.length > 0 ? Object.keys(rows[0]) : []
    const previewRows = rows.slice(0, 5)
    const rowCount = rows.length

    // Empty or near-empty sheet
    if (rowCount === 0 || headers.length < 2) {
      return {
        name,
        rowCount,
        headers,
        previewRows,
        detectedType: 'skip' as SheetDetectedType,
        datasetType: null,
        confidence: 'high' as Confidence,
        defaultSkip: true,
      }
    }

    // Skip by sheet name
    const isSkipName = SKIP_NAMES.some((s) => {
      const norm = normalizeName(name)
      const normS = normalizeName(s)
      return norm === normS || norm.includes(normS) || normS.includes(norm)
    })

    if (isSkipName) {
      return {
        name,
        rowCount,
        headers,
        previewRows,
        detectedType: 'skip' as SheetDetectedType,
        datasetType: null,
        confidence: 'high' as Confidence,
        defaultSkip: true,
      }
    }

    // Score each data type (sheet name match weighted 2×)
    const salesScore     = scoreSheetName(name, SALES_NAMES)     * 2 + scoreHeaders(headers, SALES_HEADERS)
    const menuScore      = scoreSheetName(name, MENU_NAMES)      * 2 + scoreHeaders(headers, MENU_HEADERS)
    const labourScore    = scoreSheetName(name, LABOUR_NAMES)    * 2 + scoreHeaders(headers, LABOUR_HEADERS)
    const purchasesScore = scoreSheetName(name, PURCHASES_NAMES) * 2 + scoreHeaders(headers, PURCHASES_HEADERS)
    const inventoryScore = scoreSheetName(name, INVENTORY_NAMES) * 2 + scoreHeaders(headers, INVENTORY_HEADERS)
    const wasteScore     = scoreSheetName(name, WASTE_NAMES)     * 2 + scoreHeaders(headers, WASTE_HEADERS)

    const allScores = [salesScore, menuScore, labourScore, purchasesScore, inventoryScore, wasteScore]
    const maxScore = Math.max(...allScores)

    if (maxScore === 0) {
      return {
        name,
        rowCount,
        headers,
        previewRows,
        detectedType: null,
        datasetType: null,
        confidence: 'low' as Confidence,
        defaultSkip: false,
      }
    }

    let detectedType: SheetDetectedType
    let datasetType: DatasetType

    const winner = allScores.indexOf(maxScore)
    if (winner === 0) {
      detectedType = 'sales';      datasetType = 'restaurant_sales'
    } else if (winner === 1) {
      detectedType = 'menu';       datasetType = 'restaurant_menu_items'
    } else if (winner === 2) {
      detectedType = 'labour';     datasetType = 'restaurant_labour_shifts'
    } else if (winner === 3) {
      detectedType = 'purchases';  datasetType = 'restaurant_purchases'
    } else if (winner === 4) {
      detectedType = 'inventory';  datasetType = 'restaurant_inventory_counts'
    } else {
      detectedType = 'waste';      datasetType = 'restaurant_waste_adjustments'
    }

    // Confidence from score magnitude and gap over second-best
    const scores = allScores.slice().sort((a, b) => b - a)
    const gap = scores[0] - scores[1]

    let confidence: Confidence
    if (maxScore >= 5 && gap >= 2) {
      confidence = 'high'
    } else if (maxScore >= 2) {
      confidence = 'medium'
    } else {
      confidence = 'low'
    }

    return {
      name,
      rowCount,
      headers,
      previewRows,
      detectedType,
      datasetType,
      confidence,
      defaultSkip: false,
    }
  })
}
