'use client'

import { useRef, useState } from 'react'
import {
  CheckCircle2, ChefHat, ClipboardList, Users, Upload,
  AlertCircle, ArrowLeft, ArrowRight, Layers,
  FileText, Receipt, Package, Trash2, X,
} from 'lucide-react'
import { parseFile, parseSheet, type ParseResult } from '@/lib/upload/parse'
import { inspectWorkbook, type SheetInspection } from '@/lib/upload/workbook'
import { validateRows, type ValidationResult } from '@/lib/upload/validate'
import { autoMap, DATASET_DESCRIPTIONS, DATASET_FIELDS, DATASET_LABELS, type DatasetType } from '@/lib/upload/schemas'
import { createWorkbookUpload, saveUpload, finaliseWorkbookUpload } from '@/lib/actions/upload'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'drop' | 'sheets' | 'preview' | 'mapping' | 'confirm' | 'done' | 'multi-map' | 'multi-review'

interface QueuedSheet {
  name: string
  parsed: ParseResult
  suggestedType: DatasetType | null
  inspection: SheetInspection
}

interface SheetResult {
  name: string
  datasetType: DatasetType
  imported: number
  failed: number
  error?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_ORDER: Step[] = ['drop', 'sheets', 'preview', 'mapping', 'confirm', 'done']
const STEP_LABELS: Record<Step, string> = {
  drop: 'Upload file',
  sheets: 'Select sheets',
  preview: 'Select type',
  mapping: 'Map columns',
  confirm: 'Import',
  done: 'Done',
  'multi-map': 'Map columns',
  'multi-review': 'Review import',
}

const DATASET_SHORT_LABELS: Record<DatasetType, string> = {
  restaurant_sales: 'Sales data',
  restaurant_menu_items: 'Menu & food costs',
  restaurant_labour_shifts: 'Labour shifts',
  restaurant_purchases: 'Purchases',
  restaurant_inventory_counts: 'Inventory counts',
  restaurant_waste_adjustments: 'Waste',
}

const DATASET_TYPE_BADGE: Record<DatasetType, { label: string; className: string }> = {
  restaurant_sales:             { label: 'Sales data',        className: 'bg-blue-50 border-blue-200 text-blue-700' },
  restaurant_menu_items:        { label: 'Menu & food costs', className: 'bg-amber-50 border-amber-200 text-amber-700' },
  restaurant_labour_shifts:     { label: 'Labour shifts',     className: 'bg-purple-50 border-purple-200 text-purple-700' },
  restaurant_purchases:         { label: 'Purchases',         className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  restaurant_inventory_counts:  { label: 'Inventory counts',  className: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  restaurant_waste_adjustments: { label: 'Waste',             className: 'bg-rose-50 border-rose-200 text-rose-700' },
}

const DATASET_ICONS: Record<DatasetType, React.ReactNode> = {
  restaurant_sales: <ChefHat className="h-5 w-5" />,
  restaurant_menu_items: <ClipboardList className="h-5 w-5" />,
  restaurant_labour_shifts: <Users className="h-5 w-5" />,
  restaurant_purchases: <Receipt className="h-5 w-5" />,
  restaurant_inventory_counts: <Package className="h-5 w-5" />,
  restaurant_waste_adjustments: <Trash2 className="h-5 w-5" />,
}

// SheetsStep badge lookup (by detected type key, not DatasetType)
const SHEET_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  sales:     { label: 'Sales',             className: 'bg-blue-50 border-blue-200 text-blue-700' },
  menu:      { label: 'Menu & food costs', className: 'bg-amber-50 border-amber-200 text-amber-700' },
  labour:    { label: 'Labour',            className: 'bg-purple-50 border-purple-200 text-purple-700' },
  purchases: { label: 'Purchases',         className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  inventory: { label: 'Inventory',         className: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  waste:     { label: 'Waste',             className: 'bg-rose-50 border-rose-200 text-rose-700' },
  skip:      { label: 'Informational',     className: 'bg-muted border-border text-muted-foreground' },
}

const NEEDS_REVIEW_TYPE_OPTIONS: { value: DatasetType; label: string }[] = [
  { value: 'restaurant_sales',             label: 'Sales' },
  { value: 'restaurant_menu_items',        label: 'Menu & food costs' },
  { value: 'restaurant_labour_shifts',     label: 'Labour' },
  { value: 'restaurant_purchases',         label: 'Purchases' },
  { value: 'restaurant_inventory_counts',  label: 'Inventory' },
  { value: 'restaurant_waste_adjustments', label: 'Waste' },
]

// ── Utilities ─────────────────────────────────────────────────────────────────

/** True for Next.js redirect() / notFound() signals — must be re-thrown. */
function isClientNavigationError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  if (!('digest' in err)) return false
  const digest = String((err as { digest: unknown }).digest)
  return digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND'
}

function getFileType(file: File): 'csv' | 'xlsx' | null {
  if (file.name.endsWith('.csv')) return 'csv'
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'xlsx'
  return null
}

function getSampleValue(rows: Record<string, string>[], col: string): string {
  for (const row of rows) {
    const v = row[col]?.trim()
    if (v) return v.length > 30 ? v.slice(0, 30) + '…' : v
  }
  return '—'
}

// ── Workbook progress bar ─────────────────────────────────────────────────────

function WorkbookProgressBar({
  sheets,
  currentStep,
  currentSheetIdx,
}: {
  sheets: QueuedSheet[]
  currentStep: 'multi-map' | 'multi-review'
  currentSheetIdx: number
}) {
  // Steps shown: Review workbook + per-sheet mapping + Review (done not counted)
  const steps: string[] = [
    'Review workbook',
    ...sheets.map((s) => DATASET_SHORT_LABELS[s.suggestedType!] ?? s.name),
    'Review',
  ]

  const activeIdx =
    currentStep === 'multi-map' ? 1 + currentSheetIdx : 1 + sheets.length

  const progress = steps.length > 1 ? (activeIdx / (steps.length - 1)) * 100 : 100

  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight font-heading">Import workbook</h1>
        <span className="text-sm text-muted-foreground font-medium">
          Step {activeIdx + 1} of {steps.length}
        </span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center flex-wrap gap-y-1">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center shrink-0">
            {i > 0 && <span className="text-muted-foreground/30 text-[11px] mx-1.5">›</span>}
            <span className={cn(
              'text-[11px] whitespace-nowrap',
              i < activeIdx && 'text-primary/70',
              i === activeIdx && 'text-foreground font-semibold',
              i > activeIdx && 'text-muted-foreground/50',
            )}>
              {i < activeIdx && '✓ '}{label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Single-sheet step indicator ───────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const visibleSteps = STEP_ORDER.filter((s) => s !== 'done' && s !== 'sheets')
  const currentIndex = STEP_ORDER.indexOf(current)
  return (
    <div className="flex items-center gap-0 mb-8 flex-wrap gap-y-2">
      {visibleSteps.map((step, i) => {
        const idx = STEP_ORDER.indexOf(step)
        const done = currentIndex > idx
        const active = current === step
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0',
                done && 'bg-primary border-primary text-primary-foreground',
                active && 'border-primary text-primary bg-primary/10',
                !done && !active && 'border-muted-foreground/30 text-muted-foreground/50'
              )}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                'text-sm hidden sm:block',
                active && 'text-foreground font-medium',
                !active && 'text-muted-foreground'
              )}>
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div className={cn(
                'h-px w-8 mx-2',
                currentIndex > idx ? 'bg-primary' : 'bg-muted-foreground/20'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step: Drop ────────────────────────────────────────────────────────────────

function DropStep({ onFile, error }: { onFile: (file: File) => void; error: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    onFile(files[0])
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold font-heading">Upload your file</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Drag and drop a CSV or Excel file to get started.
        </p>
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        className={cn(
          'border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm font-medium mb-3">Drop your file here, or</p>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground pointer-events-none">
          Choose file
        </span>
        <p className="text-xs text-muted-foreground mt-4">
          Supports .csv and .xlsx files, including multi-sheet workbooks
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// ── Step: Sheets (workbook review) ────────────────────────────────────────────

function SheetsStep({
  fileName,
  sheets,
  onBack,
  onContinue,
}: {
  fileName: string
  sheets: SheetInspection[]
  onBack: () => void
  onContinue: (selectedNames: string[], overrides: Record<string, DatasetType>) => void
}) {
  const dataSheets = sheets.filter((s) => !s.defaultSkip)
  const skipSheets = sheets.filter((s) => s.defaultSkip)

  const [selected, setSelected] = useState<Set<string>>(() =>
    new Set(dataSheets.filter((s) => s.detectedType && s.confidence !== 'low').map((s) => s.name))
  )
  const [overrides, setOverrides] = useState<Record<string, DatasetType>>({})

  function isNeedsReview(sheet: SheetInspection) {
    return !sheet.detectedType || sheet.confidence === 'low'
  }

  function toggleSheet(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
        setOverrides((o) => { const n = { ...o }; delete n[name]; return n })
      } else {
        next.add(name)
      }
      return next
    })
  }

  function setOverride(name: string, type: DatasetType | null) {
    if (type === null) {
      setOverrides((o) => { const n = { ...o }; delete n[name]; return n })
    } else {
      setOverrides((o) => ({ ...o, [name]: type }))
      setSelected((prev) => { const next = new Set(prev); next.add(name); return next })
    }
  }

  const hasUnresolvedReview = dataSheets.some(
    (s) => selected.has(s.name) && isNeedsReview(s) && !overrides[s.name]
  )
  const selectedCount = selected.size
  const detectedCount = dataSheets.filter((s) => s.detectedType && s.confidence !== 'low').length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold font-heading">Review workbook</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          We found multiple sheets in this workbook. Choose the ones you want Northline to import.
        </p>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-semibold mb-2">Workbook detected</p>
        <div className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-1 text-sm">
          <span className="text-muted-foreground">File</span>
          <span className="font-medium truncate text-right">{fileName}</span>
          <span className="text-muted-foreground">Sheets found</span>
          <span className="font-medium text-right">{sheets.length}</span>
          <span className="text-muted-foreground">Detected data sheets</span>
          <span className="font-medium text-right">{detectedCount}</span>
          <span className="text-muted-foreground">Informational sheets</span>
          <span className="font-medium text-right">{skipSheets.length}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</p>
        {detectedCount > 0 && (
          <button
            onClick={() =>
              setSelected(new Set(dataSheets.filter((s) => s.detectedType && s.confidence !== 'low').map((s) => s.name)))
            }
            className="text-sm text-primary hover:underline"
          >
            Select all detected data sheets
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sheets.map((sheet) => {
          const isSkip = sheet.defaultSkip
          const needsReview = !isSkip && isNeedsReview(sheet)
          const isSelected = selected.has(sheet.name)
          const override = overrides[sheet.name]
          const typeBadge = sheet.detectedType ? SHEET_TYPE_BADGE[sheet.detectedType] : null
          const confidenceLabel = isSkip ? 'Not importable' : needsReview ? 'Needs review' : 'High confidence'
          const confidenceClass = isSkip ? 'text-muted-foreground' : needsReview ? 'text-orange-600' : 'text-emerald-700'

          return (
            <div
              key={sheet.name}
              className={cn(
                'rounded-xl border-2 p-4 transition-colors',
                isSkip ? 'border-border bg-muted/20 opacity-60' :
                isSelected ? 'border-primary bg-primary/5' :
                'border-muted bg-card hover:border-primary/40'
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isSkip}
                  onChange={() => toggleSheet(sheet.name)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0 disabled:cursor-not-allowed"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{sheet.name}</span>
                    {isSkip && (
                      <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold', SHEET_TYPE_BADGE.skip.className)}>
                        {SHEET_TYPE_BADGE.skip.label}
                      </span>
                    )}
                    {!isSkip && needsReview && (
                      <span className="inline-flex items-center rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700">
                        Needs review
                      </span>
                    )}
                    {!isSkip && !needsReview && typeBadge && (
                      <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold', typeBadge.className)}>
                        {typeBadge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs">
                    <span className={confidenceClass}>{confidenceLabel}</span>
                    <span className="text-muted-foreground"> · {sheet.rowCount.toLocaleString()} rows</span>
                  </p>
                  {sheet.headers.length > 0 && (
                    <p className="text-[11px] text-muted-foreground/70">
                      Preview columns: {sheet.headers.slice(0, 5).join(', ')}
                      {sheet.headers.length > 5 && ` +${sheet.headers.length - 5} more`}
                    </p>
                  )}
                  {!isSkip && needsReview && isSelected && (
                    <select
                      value={override ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setOverride(sheet.name, val ? (val as DatasetType) : null)
                      }}
                      className={cn(
                        'mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm',
                        'hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring/50',
                        !override ? 'border-orange-300 bg-orange-50/40' : 'border-border'
                      )}
                    >
                      <option value="">— Choose data type —</option>
                      {NEEDS_REVIEW_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedCount === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Select at least one sheet to continue.</AlertDescription>
        </Alert>
      )}
      {hasUnresolvedReview && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Assign a data type to each selected &ldquo;Needs review&rdquo; sheet before continuing.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          onClick={() => onContinue([...selected], overrides)}
          disabled={selectedCount === 0 || hasUnresolvedReview}
        >
          Continue with {selectedCount} sheet{selectedCount !== 1 ? 's' : ''}{' '}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step: Multi-sheet column mapping ─────────────────────────────────────────

function MultiMapStep({
  sheet,
  mapping,
  onMapping,
  onBack,
  onNext,
}: {
  sheet: QueuedSheet
  mapping: Record<string, string>
  onMapping: (m: Record<string, string>) => void
  onBack: () => void
  onNext: () => void
}) {
  const datasetType = sheet.suggestedType!
  const fields = DATASET_FIELDS[datasetType]
  const badge = DATASET_TYPE_BADGE[datasetType]
  const rows = sheet.parsed.previewRows

  const allRequiredMapped = fields.filter((f) => f.required).every((f) => mapping[f.key])
  const mappedCount = fields.filter((f) => mapping[f.key]).length
  const requiredMissing = fields.filter((f) => f.required && !mapping[f.key]).length

  type FieldStatus = 'matched' | 'warning' | 'missing' | 'empty'
  function fieldStatus(field: (typeof fields)[number]): FieldStatus {
    const col = mapping[field.key]
    if (!col) return field.required ? 'missing' : 'empty'
    const hasSample = rows.some((r) => r[col]?.trim())
    return hasSample ? 'matched' : 'warning'
  }

  function setField(key: string, col: string) {
    onMapping({ ...mapping, [key]: col })
  }

  const confidenceLabel =
    sheet.inspection.confidence === 'high' ? 'High confidence' :
    sheet.inspection.confidence === 'medium' ? 'Medium confidence' : 'Needs review'
  const confidenceClass =
    sheet.inspection.confidence === 'low' ? 'text-orange-600' : 'text-emerald-700'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold font-heading">
          Map columns for {DATASET_SHORT_LABELS[datasetType]}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review how Northline matched this sheet. Update anything that looks incorrect before continuing.
        </p>
      </div>

      {/* Sheet summary card */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">Sheet</span>
          <span className="font-medium">{sheet.name}</span>
          <span className="text-muted-foreground">Type</span>
          <div>
            <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold', badge.className)}>
              {badge.label}
            </span>
          </div>
          <span className="text-muted-foreground">Rows</span>
          <span className="font-medium">{sheet.parsed.totalRows.toLocaleString()}</span>
          <span className="text-muted-foreground">Confidence</span>
          <span className={cn('font-medium', confidenceClass)}>{confidenceLabel}</span>
        </div>
      </div>

      {/* Status strip */}
      <div className={cn(
        'rounded-lg border px-4 py-2.5 flex items-center gap-2 text-sm',
        requiredMissing > 0
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      )}>
        {requiredMissing > 0
          ? <AlertCircle className="h-4 w-4 shrink-0" />
          : <CheckCircle2 className="h-4 w-4 shrink-0" />}
        <span>
          <span className="font-medium">{mappedCount} of {fields.length} fields mapped</span>
          {requiredMissing > 0 && (
            <span className="text-amber-700">
              {' · '}{requiredMissing} required {requiredMissing === 1 ? 'field' : 'fields'} still need assignment
            </span>
          )}
        </span>
      </div>

      {/* Mapping table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-[30%]">Northline field</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-[30%]">Your column</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-[25%]">Sample value</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-[15%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.map((field) => {
                const selectedCol = mapping[field.key] ?? ''
                const sample = selectedCol ? getSampleValue(rows, selectedCol) : '—'
                const status = fieldStatus(field)
                return (
                  <tr key={field.key} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">{field.label}</span>
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded border font-medium',
                          field.required
                            ? 'bg-destructive/10 border-destructive/20 text-destructive'
                            : 'bg-muted border-border text-muted-foreground'
                        )}>
                          {field.required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      {field.hint && <p className="text-xs text-muted-foreground mt-0.5">{field.hint}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={selectedCol}
                        onChange={(e) => setField(field.key, e.target.value)}
                        className={cn(
                          'w-full rounded-md border bg-background px-3 py-1.5 text-sm transition-colors',
                          'hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring/50',
                          field.required && !selectedCol && 'border-destructive/50 bg-destructive/5'
                        )}
                      >
                        <option value="">— skip this field —</option>
                        {sheet.parsed.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono truncate max-w-[180px]">
                      {sample}
                    </td>
                    <td className="px-4 py-3">
                      {status === 'matched' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Matched
                        </span>
                      )}
                      {status === 'warning' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                          <AlertCircle className="h-3.5 w-3.5" /> No data
                        </span>
                      )}
                      {status === 'missing' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-destructive font-medium">
                          <X className="h-3.5 w-3.5" /> Missing
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!allRequiredMapped && (
        <p className="text-sm text-muted-foreground text-center">Map all required fields to continue</p>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={!allRequiredMapped}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step: Multi-sheet review ──────────────────────────────────────────────────

function MultiReviewStep({
  sheetQueue,
  sheetMappings,
  allSheets,
  importing,
  error,
  onBack,
  onImport,
}: {
  sheetQueue: QueuedSheet[]
  sheetMappings: Record<string, Record<string, string>>
  allSheets: SheetInspection[]
  importing: boolean
  error: string | null
  onBack: () => void
  onImport: () => void
}) {
  const skippedSheets = allSheets.filter(
    (s) => !sheetQueue.some((q) => q.name === s.name)
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold font-heading">Review import</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here&apos;s what Northline is about to import from this workbook.
        </p>
      </div>

      <div className="space-y-2">
        {sheetQueue.map((sheet) => {
          const type = sheet.suggestedType!
          const m = sheetMappings[sheet.name] ?? {}
          const fields = DATASET_FIELDS[type]
          const requiredMapped = fields.filter((f) => f.required && m[f.key]).length
          const requiredTotal = fields.filter((f) => f.required).length
          const badge = DATASET_TYPE_BADGE[type]
          return (
            <div key={sheet.name} className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                    {DATASET_ICONS[type]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{sheet.name}</span>
                      <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold', badge.className)}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sheet.parsed.totalRows.toLocaleString()} rows
                      {' · '}{requiredMapped} of {requiredTotal} required fields mapped
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap shrink-0 mt-0.5">
                  Ready to import
                </span>
              </div>
            </div>
          )
        })}

        {skippedSheets.map((sheet) => (
          <div key={sheet.name} className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="font-medium">{sheet.name}</span>
              <span>—</span>
              <span>Informational sheet, skipped</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onImport} disabled={importing}>
          {importing ? 'Importing…' : `Import ${sheetQueue.length} sheet${sheetQueue.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )
}

// ── Step: Preview (single-sheet) ──────────────────────────────────────────────

function PreviewStep({
  file,
  parsed,
  datasetType,
  onDatasetType,
  onBack,
  onNext,
}: {
  file: File
  parsed: ParseResult
  datasetType: DatasetType | null
  onDatasetType: (t: DatasetType) => void
  onBack: () => void
  onNext: () => void
}) {
  const types: DatasetType[] = [
    'restaurant_sales', 'restaurant_menu_items', 'restaurant_labour_shifts',
    'restaurant_purchases', 'restaurant_inventory_counts', 'restaurant_waste_adjustments',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-heading">What type of data is this?</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          <span className="font-medium">{file.name}</span> — {parsed.totalRows.toLocaleString()} rows detected
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => onDatasetType(type)}
            className={cn(
              'text-left border-2 rounded-xl p-4 transition-colors',
              datasetType === type ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
            )}
          >
            <div className={cn('mb-2', datasetType === type ? 'text-primary' : 'text-muted-foreground')}>
              {DATASET_ICONS[type]}
            </div>
            <p className="text-sm font-semibold">{DATASET_LABELS[type]}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{DATASET_DESCRIPTIONS[type]}</p>
          </button>
        ))}
      </div>
      <div>
        <p className="text-[11px] font-medium mb-2 text-muted-foreground uppercase tracking-wider">
          Preview (first 5 rows)
        </p>
        <div className="overflow-x-auto rounded-lg border text-xs">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {parsed.headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parsed.previewRows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  {parsed.headers.map((h) => (
                    <td key={h} className="px-3 py-2 whitespace-nowrap text-muted-foreground max-w-[180px] truncate">
                      {row[h] || <span className="text-muted-foreground/40">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={onNext} disabled={!datasetType}>Continue <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

// ── Step: Mapping (single-sheet) ──────────────────────────────────────────────

function MappingStep({
  parsed,
  datasetType,
  mapping,
  onMapping,
  onBack,
  onNext,
}: {
  parsed: ParseResult
  datasetType: DatasetType
  mapping: Record<string, string>
  onMapping: (m: Record<string, string>) => void
  onBack: () => void
  onNext: () => void
}) {
  const fields = DATASET_FIELDS[datasetType]
  const mappedRequired = fields.filter((f) => f.required && mapping[f.key])
  const allRequiredMapped = fields.filter((f) => f.required).every((f) => mapping[f.key])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-heading">Map your columns</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tell us which column in your file matches each field. We&apos;ve pre-filled what we could.
        </p>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-1/3">Field</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-1/3">Your column</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-1/3">Sample value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.map((field) => {
                const selectedCol = mapping[field.key] ?? ''
                const sample = selectedCol ? getSampleValue(parsed.previewRows, selectedCol) : '—'
                return (
                  <tr key={field.key} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className="font-medium">{field.label}</span>
                      {field.required && (
                        <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">required</Badge>
                      )}
                      {field.hint && <p className="text-xs text-muted-foreground mt-0.5">{field.hint}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={selectedCol}
                        onChange={(e) => onMapping({ ...mapping, [field.key]: e.target.value })}
                        className={cn(
                          'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors',
                          'hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring/50',
                          field.required && !selectedCol && 'border-destructive/50 bg-destructive/5'
                        )}
                      >
                        {['', ...parsed.headers].map((h) => (
                          <option key={h} value={h}>{h || '— skip this field —'}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{sample}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {!allRequiredMapped && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Map all required fields before continuing —{' '}
            {mappedRequired.length} of {fields.filter((f) => f.required).length} done.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={onNext} disabled={!allRequiredMapped}>Review import <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

// ── Step: Confirm (single-sheet) ──────────────────────────────────────────────

function ConfirmStep({
  parsed,
  datasetType,
  validation,
  importing,
  error,
  onBack,
  onImport,
}: {
  parsed: ParseResult
  datasetType: DatasetType
  validation: ValidationResult
  importing: boolean
  error: string | null
  onBack: () => void
  onImport: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-heading">Ready to import</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Importing into <span className="font-medium">{DATASET_LABELS[datasetType]}</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-muted/30 p-4 text-center">
          <p className="text-3xl font-bold text-primary">{validation.validCount.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Rows ready</p>
        </div>
        <div className={cn(
          'rounded-xl border p-4 text-center',
          validation.invalidCount > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'
        )}>
          <p className={cn('text-3xl font-bold', validation.invalidCount > 0 ? 'text-destructive' : 'text-muted-foreground')}>
            {validation.invalidCount.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {validation.invalidCount > 0 ? 'Rows with issues (will be skipped)' : 'Rows with issues'}
          </p>
        </div>
      </div>
      {validation.errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">Issues found:</p>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 divide-y divide-destructive/10 max-h-48 overflow-y-auto">
            {validation.errors.map((e) => (
              <div key={e.row} className="px-4 py-2 text-xs">
                <span className="font-medium text-muted-foreground">Row {e.row}:</span>{' '}
                <span className="text-destructive">{e.errors.join(', ')}</span>
              </div>
            ))}
            {validation.invalidCount > 50 && (
              <div className="px-4 py-2 text-xs text-muted-foreground italic">
                …and {(validation.invalidCount - 50).toLocaleString()} more
              </div>
            )}
          </div>
        </div>
      )}
      {validation.validCount === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No valid rows to import. Go back and fix the column mapping or check your file.</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={importing}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={onImport} disabled={importing || validation.validCount === 0}>
          {importing ? 'Importing…' : 'Import data'}
        </Button>
      </div>
    </div>
  )
}

// ── Step: Done ────────────────────────────────────────────────────────────────

function DoneStep({
  sheetResults,
  singleResult,
  isWorkbook,
  onReset,
}: {
  sheetResults: SheetResult[]
  singleResult?: { imported: number; failed: number } | null
  isWorkbook?: boolean
  onReset: () => void
}) {
  const totalImported = isWorkbook
    ? sheetResults.reduce((s, r) => s + r.imported, 0)
    : (singleResult?.imported ?? 0)
  const totalFailed = isWorkbook
    ? sheetResults.reduce((s, r) => s + r.failed, 0)
    : (singleResult?.failed ?? 0)

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold font-heading">Import complete</h2>
          <p className="text-muted-foreground mt-1">
            {isWorkbook
              ? 'Your workbook has been processed successfully.'
              : (
                <>
                  {totalImported.toLocaleString()} {totalImported === 1 ? 'row' : 'rows'} imported successfully.
                  {totalFailed > 0 && (
                    <span className="text-destructive"> {totalFailed.toLocaleString()} skipped due to errors.</span>
                  )}
                </>
              )
            }
          </p>
        </div>
      </div>

      {isWorkbook && sheetResults.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sheet results</p>
          </div>
          <div className="divide-y divide-border">
            {sheetResults.map((r) => {
              const badge = DATASET_TYPE_BADGE[r.datasetType]
              return (
                <div key={r.name} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-primary/70">
                      {DATASET_ICONS[r.datasetType]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold', badge.className)}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {r.error ? (
                      <span className="text-destructive text-xs">{r.error}</span>
                    ) : (
                      <>
                        <p className="font-semibold text-emerald-700">{r.imported.toLocaleString()} imported</p>
                        {r.failed > 0 && <p className="text-xs text-muted-foreground">{r.failed.toLocaleString()} skipped</p>}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3 flex-wrap">
        {isWorkbook ? (
          <>
            <Button asChild><a href="/dashboard">View dashboard</a></Button>
            <Button asChild variant="outline"><a href="/uploads">View my files</a></Button>
            <Button variant="outline" onClick={onReset}>Import another workbook</Button>
          </>
        ) : (
          <>
            <Button onClick={onReset} variant="outline">Upload another file</Button>
            <Button asChild variant="outline"><a href="/uploads">View my files</a></Button>
            <Button asChild><a href="/dashboard">Go to dashboard</a></Button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function UploadPage() {
  // ── Core single-sheet state ────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('drop')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [datasetType, setDatasetType] = useState<DatasetType | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [singleResult, setSingleResult] = useState<{ imported: number; failed: number } | null>(null)

  // ── Multi-sheet state ──────────────────────────────────────────────────────
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [workbookSheets, setWorkbookSheets] = useState<SheetInspection[] | null>(null)
  const [sheetQueue, setSheetQueue] = useState<QueuedSheet[]>([])
  const [sheetMappings, setSheetMappings] = useState<Record<string, Record<string, string>>>({})
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0)
  const [sheetResults, setSheetResults] = useState<SheetResult[]>([])
  const [workbookUploadId, setWorkbookUploadId] = useState<string | null>(null)

  const isWorkbook = sheetQueue.length > 0
  const currentSheet = sheetQueue[currentSheetIdx] ?? null

  // ── File handler ───────────────────────────────────────────────────────────

  async function handleFile(f: File) {
    setError(null)
    const type = getFileType(f)
    if (!type) {
      setError('Unsupported file type. Please upload a .csv or .xlsx file.')
      return
    }
    setParsing(true)
    try {
      const buffer = await f.arrayBuffer()
      setFileBuffer(buffer)
      setFile(f)

      if (type === 'xlsx') {
        const sheets = inspectWorkbook(buffer)
        const dataSheets = sheets.filter((s) => !s.defaultSkip && s.rowCount > 0 && s.headers.length >= 2)

        if (dataSheets.length >= 2) {
          setWorkbookSheets(sheets)
          setSheetQueue([])
          setSheetMappings({})
          setCurrentSheetIdx(0)
          setSheetResults([])
          setWorkbookUploadId(null)
          setStep('sheets')
          return
        }

        const targetSheet = dataSheets[0] ?? sheets[0]
        if (!targetSheet) throw new Error('No sheets found in this file.')
        const result = parseSheet(buffer, targetSheet.name)
        setParsed(result)
      } else {
        const result = await parseFile(f)
        setParsed(result)
      }

      setDatasetType(null)
      setMapping({})
      setValidation(null)
      setSheetQueue([])
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.')
    } finally {
      setParsing(false)
    }
  }

  // ── Multi-sheet handlers ───────────────────────────────────────────────────

  function handleSheetsContinue(selectedNames: string[], overrides: Record<string, DatasetType>) {
    if (!fileBuffer || !workbookSheets) return
    setParsing(true)
    try {
      const ordered = workbookSheets.filter((s) => selectedNames.includes(s.name))
      const queue: QueuedSheet[] = ordered.map((s) => ({
        name: s.name,
        parsed: parseSheet(fileBuffer, s.name),
        suggestedType: overrides[s.name] ?? s.datasetType,
        inspection: s,
      }))

      // Auto-map all sheets upfront
      const mappings: Record<string, Record<string, string>> = {}
      for (const q of queue) {
        mappings[q.name] = q.suggestedType ? autoMap(q.parsed.headers, q.suggestedType) : {}
      }

      setSheetQueue(queue)
      setSheetMappings(mappings)
      setCurrentSheetIdx(0)
      setSheetResults([])
      setWorkbookUploadId(null)
      setStep('multi-map')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read sheets.')
    } finally {
      setParsing(false)
    }
  }

  function handleMultiMapNext() {
    const nextIdx = currentSheetIdx + 1
    if (nextIdx < sheetQueue.length) {
      setCurrentSheetIdx(nextIdx)
    } else {
      setStep('multi-review')
    }
  }

  function handleMultiMapBack() {
    if (currentSheetIdx === 0) {
      setStep('sheets')
    } else {
      setCurrentSheetIdx(currentSheetIdx - 1)
    }
  }

  async function handleMultiImport() {
    if (!file) return
    setImporting(true)
    setError(null)

    try {
      const fileType = getFileType(file)!

      // Step 1: Create one upload record for the whole workbook upfront.
      const uploadRes = await createWorkbookUpload({
        fileName: file.name,
        fileType,
        fileSizeBytes: file.size,
      })

      if (uploadRes.error || !uploadRes.uploadId) {
        setError(uploadRes.error ?? 'Failed to create upload record.')
        return
      }

      const uploadId = uploadRes.uploadId
      const results: SheetResult[] = []

      // Step 2: Import each sheet independently — one failure never blocks the rest.
      for (const sheet of sheetQueue) {
        const type = sheet.suggestedType!
        const m = sheetMappings[sheet.name] ?? {}
        const v = validateRows(sheet.parsed.rows, m, type)
        const validRows = sheet.parsed.rows.filter((_, i) => {
          const rowNum = i + 2
          return !v.errors.some((e) => e.row === rowNum)
        })

        try {
          const res = await saveUpload({
            fileName: file.name,
            fileType,
            fileSizeBytes: file.size,
            targetTable: type,
            mapping: m,
            rows: validRows,
            rowsTotal: sheet.parsed.totalRows,
            sheetName: sheet.name,
            existingUploadId: uploadId,
          })
          results.push({
            name: sheet.name,
            datasetType: type,
            imported: res.imported ?? 0,
            failed: res.failed ?? 0,
            error: res.error,
          })
        } catch (sheetErr) {
          // Navigation signals must bubble up
          if (isClientNavigationError(sheetErr)) throw sheetErr
          const message = sheetErr instanceof Error ? sheetErr.message : 'Unexpected error'
          console.error(`[workbook] sheet "${sheet.name}" failed:`, sheetErr)
          results.push({
            name: sheet.name,
            datasetType: type,
            imported: 0,
            failed: sheet.parsed.totalRows,
            error: `Sheet failed: ${message}`,
          })
        }
      }

      // Step 3: Seal the upload record with the final status.
      const anySucceeded = results.some((r) => r.imported > 0)
      await finaliseWorkbookUpload(uploadId, anySucceeded)

      setSheetResults(results)
      setWorkbookUploadId(uploadId)
      setStep('done')
    } catch (err) {
      // Only re-throw actual Next.js navigation signals (redirect / notFound)
      if (isClientNavigationError(err)) throw err
      console.error('[workbook] import failed:', err)
      const message = err instanceof Error ? err.message : 'Import failed. Please try again.'
      setError(
        message === 'An unexpected response was received from the server.'
          ? 'The server returned an unexpected error. This is usually caused by a very large file or a temporary server issue. Please try again, or split the workbook into smaller files.'
          : message
      )
    } finally {
      setImporting(false)
    }
  }

  // ── Single-sheet handlers ──────────────────────────────────────────────────

  function handleDatasetType(type: DatasetType) {
    setDatasetType(type)
    if (parsed) setMapping(autoMap(parsed.headers, type))
  }

  function handleGoToConfirm() {
    if (!parsed || !datasetType) return
    setValidation(validateRows(parsed.rows, mapping, datasetType))
    setStep('confirm')
  }

  async function handleImport() {
    if (!file || !parsed || !datasetType || !validation) return
    setImporting(true)
    setError(null)

    const fileType = getFileType(file)!
    const validRows = parsed.rows.filter((_, i) => {
      const rowNum = i + 2
      return !validation.errors.some((e) => e.row === rowNum)
    })

    const res = await saveUpload({
      fileName: file.name,
      fileType,
      fileSizeBytes: file.size,
      targetTable: datasetType,
      mapping,
      rows: validRows,
    })

    setImporting(false)
    if (res.error) { setError(res.error); return }
    setSingleResult({ imported: res.imported ?? 0, failed: res.failed ?? 0 })
    setStep('done')
  }

  function handleReset() {
    setStep('drop')
    setFile(null)
    setFileBuffer(null)
    setParsed(null)
    setDatasetType(null)
    setMapping({})
    setValidation(null)
    setSingleResult(null)
    setWorkbookSheets(null)
    setSheetQueue([])
    setSheetMappings({})
    setCurrentSheetIdx(0)
    setSheetResults([])
    setWorkbookUploadId(null)
    setError(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isMultiStep = step === 'multi-map' || step === 'multi-review'
  const showSingleHeader = !isMultiStep && step !== 'done'

  return (
    <div className="px-8 py-7 max-w-3xl mx-auto">
      {/* Single-sheet header + step indicator */}
      {showSingleHeader && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight font-heading">Import data</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Upload a CSV or Excel file — we&apos;ll walk you through the rest.
            </p>
          </div>
          {step !== 'sheets' && (
            <StepIndicator current={step} />
          )}
        </>
      )}

      {/* Workbook progress bar */}
      {isMultiStep && (
        <WorkbookProgressBar
          sheets={sheetQueue}
          currentStep={step as 'multi-map' | 'multi-review'}
          currentSheetIdx={currentSheetIdx}
        />
      )}

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {parsing && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm">Reading your file…</p>
          </div>
        )}

        {step === 'drop' && !parsing && (
          <DropStep onFile={handleFile} error={error} />
        )}

        {step === 'sheets' && workbookSheets && file && !parsing && (
          <SheetsStep
            fileName={file.name}
            sheets={workbookSheets}
            onBack={() => setStep('drop')}
            onContinue={handleSheetsContinue}
          />
        )}

        {step === 'multi-map' && currentSheet && !parsing && (
          <MultiMapStep
            sheet={currentSheet}
            mapping={sheetMappings[currentSheet.name] ?? {}}
            onMapping={(m) => setSheetMappings((prev) => ({ ...prev, [currentSheet.name]: m }))}
            onBack={handleMultiMapBack}
            onNext={handleMultiMapNext}
          />
        )}

        {step === 'multi-review' && workbookSheets && !parsing && (
          <MultiReviewStep
            sheetQueue={sheetQueue}
            sheetMappings={sheetMappings}
            allSheets={workbookSheets}
            importing={importing}
            error={error}
            onBack={() => { setCurrentSheetIdx(sheetQueue.length - 1); setStep('multi-map') }}
            onImport={handleMultiImport}
          />
        )}

        {step === 'preview' && parsed && file && (
          <PreviewStep
            file={file}
            parsed={parsed}
            datasetType={datasetType}
            onDatasetType={handleDatasetType}
            onBack={() => workbookSheets ? setStep('sheets') : setStep('drop')}
            onNext={() => setStep('mapping')}
          />
        )}

        {step === 'mapping' && parsed && datasetType && (
          <MappingStep
            parsed={parsed}
            datasetType={datasetType}
            mapping={mapping}
            onMapping={setMapping}
            onBack={() => setStep('preview')}
            onNext={handleGoToConfirm}
          />
        )}

        {step === 'confirm' && parsed && datasetType && validation && (
          <ConfirmStep
            parsed={parsed}
            datasetType={datasetType}
            validation={validation}
            importing={importing}
            error={error}
            onBack={() => setStep('mapping')}
            onImport={handleImport}
          />
        )}

        {step === 'done' && (
          <DoneStep
            sheetResults={sheetResults}
            singleResult={singleResult}
            isWorkbook={isWorkbook}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  )
}
