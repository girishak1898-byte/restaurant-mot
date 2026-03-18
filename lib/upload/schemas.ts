export type FieldType = 'text' | 'date' | 'number' | 'boolean'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required: boolean
  hint?: string
  /** Alternative column names that autoMap should recognise (normalised for matching). */
  aliases?: string[]
}

export type DatasetType =
  | 'restaurant_sales'
  | 'restaurant_menu_items'
  | 'restaurant_labour_shifts'
  | 'restaurant_purchases'
  | 'restaurant_inventory_counts'
  | 'restaurant_waste_adjustments'

export const DATASET_LABELS: Record<DatasetType, string> = {
  restaurant_sales: 'Sales Data',
  restaurant_menu_items: 'Menu Items',
  restaurant_labour_shifts: 'Labour & Shifts',
  restaurant_purchases: 'Purchases',
  restaurant_inventory_counts: 'Inventory Counts',
  restaurant_waste_adjustments: 'Waste & Adjustments',
}

export const DATASET_DESCRIPTIONS: Record<DatasetType, string> = {
  restaurant_sales: 'Daily transactions, orders, items sold, revenue, and payment methods.',
  restaurant_menu_items: 'Your menu — item names, categories, prices, and food costs.',
  restaurant_labour_shifts: 'Staff schedules, hours worked, roles, and labour costs.',
  restaurant_purchases: 'Goods received from suppliers — quantities, unit costs, and total spend.',
  restaurant_inventory_counts: 'Periodic stock counts with opening and closing quantities and values.',
  restaurant_waste_adjustments: 'Recorded waste events — quantity, reason, and estimated cost.',
}

export const DATASET_FIELDS: Record<DatasetType, FieldDef[]> = {
  restaurant_sales: [
    { key: 'sale_date', label: 'Sale Date', type: 'date', required: true, hint: 'e.g. 2024-01-15', aliases: ['date', 'transaction_date', 'order_date', 'timestamp'] },
    { key: 'order_id', label: 'Order ID', type: 'text', required: false, aliases: ['transaction_id'] },
    { key: 'outlet_name', label: 'Outlet / Location', type: 'text', required: false, aliases: ['outlet', 'location', 'store', 'site', 'branch'] },
    { key: 'channel', label: 'Channel', type: 'text', required: false, hint: 'e.g. Dine-in, Delivery, Takeaway', aliases: ['order_type', 'sales_channel', 'source'] },
    { key: 'item_name', label: 'Item Name', type: 'text', required: false, aliases: ['menu_item', 'product', 'product_name', 'item', 'description', 'item_description', 'menu_item_name', 'dish', 'food_item'] },
    { key: 'item_category', label: 'Category', type: 'text', required: false, aliases: ['category', 'item_category', 'menu_category', 'food_category'] },
    { key: 'quantity', label: 'Quantity', type: 'number', required: false, aliases: ['qty', 'units', 'count'] },
    { key: 'gross_amount', label: 'Gross Amount', type: 'number', required: false, aliases: ['gross', 'gross_sale', 'gross_sales', 'gross_revenue', 'gross_total', 'subtotal', 'sub_total', 'amount'] },
    { key: 'discount_amount', label: 'Discount Amount', type: 'number', required: false, aliases: ['discount', 'discount_total', 'total_discount'] },
    { key: 'net_amount', label: 'Net Amount', type: 'number', required: false, aliases: ['net', 'net_sale', 'net_sales', 'net_revenue', 'net_total', 'total_sales', 'total_revenue', 'revenue', 'total'] },
    { key: 'payment_method', label: 'Payment Method', type: 'text', required: false, aliases: ['payment', 'pay_method', 'payment_type', 'tender'] },
    { key: 'customer_type', label: 'Customer Type', type: 'text', required: false },
  ],
  restaurant_menu_items: [
    { key: 'item_name', label: 'Item Name', type: 'text', required: true },
    { key: 'item_category', label: 'Category', type: 'text', required: false },
    { key: 'base_price', label: 'Base Price', type: 'number', required: false },
    { key: 'food_cost_per_item', label: 'Food Cost per Item', type: 'number', required: false },
    {
      key: 'is_active',
      label: 'Is Active',
      type: 'boolean',
      required: false,
      hint: 'true / false or yes / no',
    },
  ],
  restaurant_labour_shifts: [
    { key: 'shift_date', label: 'Shift Date', type: 'date', required: true, hint: 'e.g. 2024-01-15', aliases: ['date', 'shift_start'] },
    { key: 'staff_name', label: 'Staff Name', type: 'text', required: false, aliases: ['employee', 'name', 'worker'] },
    { key: 'role', label: 'Role / Position', type: 'text', required: false, aliases: ['position', 'job_title'] },
    { key: 'outlet_name', label: 'Outlet / Location', type: 'text', required: false, aliases: ['outlet', 'location', 'store', 'site'] },
    { key: 'hours_worked', label: 'Hours Worked', type: 'number', required: false, aliases: ['hours', 'total_hours', 'paid_hours'] },
    { key: 'hourly_rate', label: 'Hourly Rate', type: 'number', required: false, aliases: ['rate', 'pay_rate'] },
    { key: 'labour_cost', label: 'Labour Cost', type: 'number', required: false, aliases: ['cost', 'total_pay', 'wage', 'labor_cost'] },
  ],

  // ── Phase 1: Purchases ──────────────────────────────────────────────────────
  restaurant_purchases: [
    { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, hint: 'e.g. 2024-01-15' },
    { key: 'supplier', label: 'Supplier', type: 'text', required: false },
    { key: 'item_name', label: 'Item Name', type: 'text', required: false },
    { key: 'item_category', label: 'Category', type: 'text', required: false },
    { key: 'outlet_name', label: 'Outlet / Location', type: 'text', required: false },
    { key: 'quantity', label: 'Quantity', type: 'number', required: false },
    { key: 'unit_of_measure', label: 'Unit', type: 'text', required: false, hint: 'e.g. kg, ea, litre' },
    { key: 'unit_cost', label: 'Unit Cost', type: 'number', required: false },
    { key: 'total_cost', label: 'Total Cost', type: 'number', required: false },
    { key: 'invoice_reference', label: 'Invoice / Reference', type: 'text', required: false },
  ],

  // ── Phase 2: Inventory Counts ───────────────────────────────────────────────
  restaurant_inventory_counts: [
    { key: 'count_date', label: 'Count Date', type: 'date', required: true, hint: 'e.g. 2024-01-31' },
    { key: 'item_name', label: 'Item Name', type: 'text', required: false },
    { key: 'item_category', label: 'Category', type: 'text', required: false },
    { key: 'outlet_name', label: 'Outlet / Location', type: 'text', required: false },
    { key: 'opening_quantity', label: 'Opening Quantity', type: 'number', required: false },
    { key: 'closing_quantity', label: 'Closing Quantity', type: 'number', required: false },
    { key: 'unit_of_measure', label: 'Unit', type: 'text', required: false, hint: 'e.g. kg, ea, litre' },
    { key: 'unit_cost', label: 'Unit Cost', type: 'number', required: false },
    { key: 'opening_value', label: 'Opening Value', type: 'number', required: false, hint: 'Opening qty × unit cost' },
    { key: 'closing_value', label: 'Closing Value', type: 'number', required: false, hint: 'Closing qty × unit cost' },
    { key: 'count_reference', label: 'Count Reference', type: 'text', required: false },
  ],

  // ── Phase 3: Waste & Adjustments ────────────────────────────────────────────
  restaurant_waste_adjustments: [
    { key: 'waste_date', label: 'Waste Date', type: 'date', required: true, hint: 'e.g. 2024-01-15' },
    { key: 'item_name', label: 'Item Name', type: 'text', required: false },
    { key: 'item_category', label: 'Category', type: 'text', required: false },
    { key: 'outlet_name', label: 'Outlet / Location', type: 'text', required: false },
    { key: 'quantity_wasted', label: 'Quantity Wasted', type: 'number', required: false },
    { key: 'unit_of_measure', label: 'Unit', type: 'text', required: false },
    { key: 'unit_cost', label: 'Unit Cost', type: 'number', required: false },
    { key: 'estimated_cost', label: 'Estimated Cost', type: 'number', required: false, hint: 'Qty × unit cost' },
    { key: 'waste_reason', label: 'Reason', type: 'text', required: false, hint: 'e.g. Spoilage, Over-prep, Quality' },
  ],
}

/** Normalize a string for loose matching (automap). */
export function normalizeKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Try to auto-match file headers to schema fields by name similarity. */
export function autoMap(headers: string[], datasetType: DatasetType): Record<string, string> {
  const fields = DATASET_FIELDS[datasetType]
  const mapping: Record<string, string> = {}
  const used = new Set<string>()

  for (const field of fields) {
    // 1. Exact match on field key (e.g. "shift_date" ↔ "Shift Date")
    const fieldNorm = normalizeKey(field.key)
    let match = headers.find((h) => !used.has(h) && normalizeKey(h) === fieldNorm)

    // 2. Match on field label (e.g. "Shift Date" ↔ "Shift Date")
    if (!match) {
      const labelNorm = normalizeKey(field.label)
      match = headers.find((h) => !used.has(h) && normalizeKey(h) === labelNorm)
    }

    // 3. Match on aliases (e.g. "date" ↔ "Date")
    if (!match && field.aliases) {
      for (const alias of field.aliases) {
        match = headers.find((h) => !used.has(h) && normalizeKey(h) === normalizeKey(alias))
        if (match) break
      }
    }

    // 4. Contains match — header includes a long key/label/alias (≥ 8 chars).
    //    Mirrors the substring matching used by the workbook detection step,
    //    so headers like "Gross Sale Amount" still map via "grossamount" or "grosssale".
    if (!match) {
      const labelNorm = normalizeKey(field.label)
      const candidates: string[] = [fieldNorm, labelNorm]
      if (field.aliases) {
        for (const alias of field.aliases) candidates.push(normalizeKey(alias))
      }
      for (const candidate of candidates) {
        if (candidate.length < 8) continue // skip short terms to avoid false positives
        match = headers.find((h) => !used.has(h) && normalizeKey(h).includes(candidate))
        if (match) break
      }
    }

    if (match) {
      mapping[field.key] = match
      used.add(match)
    }
  }
  return mapping
}
