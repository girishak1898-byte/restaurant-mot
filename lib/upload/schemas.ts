export type FieldType = 'text' | 'date' | 'number' | 'boolean'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required: boolean
  hint?: string
}

export type DatasetType =
  | 'restaurant_sales'
  | 'restaurant_menu_items'
  | 'restaurant_labour_shifts'

export const DATASET_LABELS: Record<DatasetType, string> = {
  restaurant_sales: 'Sales Data',
  restaurant_menu_items: 'Menu Items',
  restaurant_labour_shifts: 'Labour & Shifts',
}

export const DATASET_DESCRIPTIONS: Record<DatasetType, string> = {
  restaurant_sales: 'Daily transactions, orders, items sold, revenue, and payment methods.',
  restaurant_menu_items: 'Your menu — item names, categories, prices, and food costs.',
  restaurant_labour_shifts: 'Staff schedules, hours worked, roles, and labour costs.',
}

export const DATASET_FIELDS: Record<DatasetType, FieldDef[]> = {
  restaurant_sales: [
    { key: 'sale_date', label: 'Sale Date', type: 'date', required: true, hint: 'e.g. 2024-01-15' },
    { key: 'order_id', label: 'Order ID', type: 'text', required: false },
    { key: 'outlet_name', label: 'Outlet / Location', type: 'text', required: false },
    { key: 'channel', label: 'Channel', type: 'text', required: false, hint: 'e.g. Dine-in, Delivery, Takeaway' },
    { key: 'item_name', label: 'Item Name', type: 'text', required: false },
    { key: 'item_category', label: 'Category', type: 'text', required: false },
    { key: 'quantity', label: 'Quantity', type: 'number', required: false },
    { key: 'gross_amount', label: 'Gross Amount', type: 'number', required: false },
    { key: 'discount_amount', label: 'Discount Amount', type: 'number', required: false },
    { key: 'net_amount', label: 'Net Amount', type: 'number', required: false },
    { key: 'payment_method', label: 'Payment Method', type: 'text', required: false },
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
    { key: 'shift_date', label: 'Shift Date', type: 'date', required: true, hint: 'e.g. 2024-01-15' },
    { key: 'staff_name', label: 'Staff Name', type: 'text', required: false },
    { key: 'role', label: 'Role / Position', type: 'text', required: false },
    { key: 'outlet_name', label: 'Outlet / Location', type: 'text', required: false },
    { key: 'hours_worked', label: 'Hours Worked', type: 'number', required: false },
    { key: 'hourly_rate', label: 'Hourly Rate', type: 'number', required: false },
    { key: 'labour_cost', label: 'Labour Cost', type: 'number', required: false },
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
  for (const field of fields) {
    const fieldNorm = normalizeKey(field.key)
    const match = headers.find((h) => normalizeKey(h) === fieldNorm)
    if (match) mapping[field.key] = match
  }
  return mapping
}
