'use client'

import { useRef, useState } from 'react'
import {
  CheckCircle2, ChefHat, ClipboardList, Users, Upload,
  AlertCircle, ArrowLeft, ArrowRight, Layers, SkipForward,
  FileText, HelpCircle, Receipt, Package, Trash2,
} from 'lucide-react'
import { parseFile, parseSheet, type ParseResult } from '@/lib/upload/parse'
import { inspectWorkbook, type SheetInspection, type Confidence } from '@/lib/upload/workbook'
import { validateRows, type ValidationResult } from '@/lib/upload/validate'
import { autoMap, DATASET_DESCRIPTIONS, DATASET_FIELDS, DATASET_LABELS, type DatasetType } from '@/lib/upload/schemas'
import { saveUpload, finaliseWorkbookUpload } from '@/lib/actions/upload'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'drop' | 'sheets' | 'preview' | 'mapping' | 'confirm' | 'done'

/** A sheet selected by the user for import, with its parsed data ready. */
interface QueuedSheet {
  name: string
  parsed: ParseResult
  suggestedType: DatasetType | null
}

/** Import result for one sheet, accumulated for the done screen. */
interface SheetResult {
  name: string
  datasetType: DatasetType
  imported: number
  failed: number
  error?: string
}

const STEP_ORDER: Step[] = ['drop', 'sheets', 'preview', 'mapping', 'confirm', 'done']
const STEP_LABELS: Record<Step, string> = {
  drop: 'Upload file',
  sheets: 'Select sheets',
  preview: 'Select type',
  mapping: 'Map columns',
  confirm: 'Import',
  done: 'Done',
}

const DATASET_ICONS: Record<DatasetType, React.ReactNode> = {
  restaurant_sales: <ChefHat className="h-5 w-5" />,
  restaurant_menu_items: <ClipboardList className="h-5 w-5" />,
  restaurant_labour_shifts: <Users className="h-5 w-5" />,
  restaurant_purchases: <Receipt className="h-5 w-5" />,
  restaurant_inventory_counts: <Package className="h-5 w-5" />,
  restaurant_waste_adjustments: <Trash2 className="h-5 w-5" />,
}

// ── Utilities ────────────────────────────────────────────────────────────────

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

// ── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, isMultiSheet }: { current: Step; isMultiSheet: boolean }) {
  // The 'sheets' step is only visible for multi-sheet workbooks
  const visibleSteps = STEP_ORDER.filter((s) => {
    if (s === 'done') return false
    if (s === 'sheets' && !isMultiSheet) return false
    return true
  })
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
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0',
                  done && 'bg-primary border-primary text-primary-foreground',
                  active && 'border-primary text-primary bg-primary/10',
                  !done && !active && 'border-muted-foreground/30 text-muted-foreground/50'
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-sm hidden sm:block',
                  active && 'text-foreground font-medium',
                  !active && 'text-muted-foreground'
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div
                className={cn(
                  'h-px w-8 mx-2',
                  currentIndex > idx ? 'bg-primary' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Sheet type badge helpers ─────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  sales:     { label: 'Sales',      className: 'bg-blue-50 border-blue-200 text-blue-700' },
  menu:      { label: 'Menu',       className: 'bg-amber-50 border-amber-200 text-amber-700' },
  labour:    { label: 'Labour',     className: 'bg-purple-50 border-purple-200 text-purple-700' },
  purchases: { label: 'Purchases',  className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  inventory: { label: 'Inventory',  className: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  waste:     { label: 'Waste',      className: 'bg-rose-50 border-rose-200 text-rose-700' },
  skip:      { label: 'Info sheet', className: 'bg-muted border-border text-muted-foreground' },
}

const CONFIDENCE_BADGE: Record<Confidence, { label: string; className: string }> = {
  high:   { label: 'High confidence',   className: 'text-emerald-700' },
  medium: { label: 'Medium confidence', className: 'text-amber-700' },
  low:    { label: 'Needs review',      className: 'text-orange-700' },
}

// ── Step: Sheets ─────────────────────────────────────────────────────────────

function SheetsStep({
  fileName,
  sheets,
  selected,
  onToggle,
  onBack,
  onContinue,
}: {
  fileName: string
  sheets: SheetInspection[]
  selected: Set<string>
  onToggle: (name: string) => void
  onBack: () => void
  onContinue: () => void
}) {
  const dataSheets = sheets.filter((s) => !s.defaultSkip)
  const skipSheets = sheets.filter((s) => s.defaultSkip)
  const selectedCount = selected.size

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-heading">Select sheets to import</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          <span className="font-medium">{fileName}</span> contains {sheets.length} sheets.
          Select the ones that contain data you want to import.
        </p>
      </div>

      {/* Data sheets */}
      {dataSheets.length > 0 && (
        <div className="space-y-2">
          {dataSheets.map((sheet) => {
            const isSelected = selected.has(sheet.name)
            const typeBadge = sheet.detectedType ? TYPE_BADGE[sheet.detectedType] : null
            const confBadge = CONFIDENCE_BADGE[sheet.confidence]

            return (
              <label
                key={sheet.name}
                className={cn(
                  'flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/40 bg-card'
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(sheet.name)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm">{sheet.name}</span>
                    {typeBadge && (
                      <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold', typeBadge.className)}>
                        {typeBadge.label}
                      </span>
                    )}
                    {!sheet.detectedType && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-orange-700">
                        <HelpCircle className="h-3 w-3" />
                        Unrecognised — you&apos;ll choose the type next
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {sheet.rowCount.toLocaleString()} rows
                    </span>
                    {sheet.detectedType && (
                      <span className={cn('text-xs', confBadge.className)}>
                        {confBadge.label}
                      </span>
                    )}
                  </div>
                  {sheet.headers.length > 0 && (
                    <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">
                      Columns: {sheet.headers.slice(0, 6).join(', ')}
                      {sheet.headers.length > 6 && ` +${sheet.headers.length - 6} more`}
                    </p>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      )}

      {/* Skip/info sheets — shown collapsed */}
      {skipSheets.length > 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SkipForward className="h-4 w-4 shrink-0" />
            <span>
              {skipSheets.length === 1
                ? `"${skipSheets[0].name}" looks like an info sheet and will be skipped.`
                : `${skipSheets.map((s) => `"${s.name}"`).join(', ')} look like info sheets and will be skipped.`}
            </span>
          </div>
        </div>
      )}

      {selectedCount === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Select at least one sheet to continue.</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onContinue} disabled={selectedCount === 0}>
          Continue with {selectedCount} sheet{selectedCount !== 1 ? 's' : ''}{' '}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step 1: Drop ─────────────────────────────────────────────────────────────

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
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
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

// ── Step 2: Preview + type selection ─────────────────────────────────────────

function PreviewStep({
  file,
  parsed,
  datasetType,
  onDatasetType,
  onBack,
  onNext,
  sheetContext,
}: {
  file: File
  parsed: ParseResult
  datasetType: DatasetType | null
  onDatasetType: (t: DatasetType) => void
  onBack: () => void
  onNext: () => void
  sheetContext?: { current: number; total: number; name: string } | null
}) {
  const types: DatasetType[] = [
    'restaurant_sales',
    'restaurant_menu_items',
    'restaurant_labour_shifts',
    'restaurant_purchases',
    'restaurant_inventory_counts',
    'restaurant_waste_adjustments',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-heading">What type of data is this?</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {sheetContext ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted border border-border px-2 py-0.5 text-[11px] font-medium mr-1.5">
                <Layers className="h-3 w-3" />
                Sheet {sheetContext.current} of {sheetContext.total}: {sheetContext.name}
              </span>
              {parsed.totalRows.toLocaleString()} rows detected
            </>
          ) : (
            <>
              <span className="font-medium">{file.name}</span> — {parsed.totalRows.toLocaleString()} rows detected
            </>
          )}
        </p>
      </div>

      {/* Dataset type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => onDatasetType(type)}
            className={cn(
              'text-left border-2 rounded-xl p-4 transition-colors',
              datasetType === type
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-primary/50'
            )}
          >
            <div className={cn('mb-2', datasetType === type ? 'text-primary' : 'text-muted-foreground')}>
              {DATASET_ICONS[type]}
            </div>
            <p className="text-sm font-semibold">{DATASET_LABELS[type]}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {DATASET_DESCRIPTIONS[type]}
            </p>
          </button>
        ))}
      </div>

      {/* Data preview */}
      <div>
        <p className="text-[11px] font-medium mb-2 text-muted-foreground uppercase tracking-wider">
          Preview (first 5 rows)
        </p>
        <div className="overflow-x-auto rounded-lg border text-xs">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {parsed.headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
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
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={!datasetType}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step 3: Column mapping ────────────────────────────────────────────────────

function MappingStep({
  parsed,
  datasetType,
  mapping,
  onMapping,
  onBack,
  onNext,
  sheetContext,
}: {
  parsed: ParseResult
  datasetType: DatasetType
  mapping: Record<string, string>
  onMapping: (m: Record<string, string>) => void
  onBack: () => void
  onNext: () => void
  sheetContext?: { current: number; total: number; name: string } | null
}) {
  const fields = DATASET_FIELDS[datasetType]
  const mappedRequired = fields.filter((f) => f.required && mapping[f.key])
  const allRequiredMapped = fields.filter((f) => f.required).every((f) => mapping[f.key])

  function setField(fieldKey: string, col: string) {
    onMapping({ ...mapping, [fieldKey]: col || '' })
  }

  const headerOptions = ['', ...parsed.headers]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-heading">Map your columns</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {sheetContext && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted border border-border px-2 py-0.5 text-[11px] font-medium mr-1.5">
              <Layers className="h-3 w-3" />
              Sheet {sheetContext.current} of {sheetContext.total}: {sheetContext.name}
            </span>
          )}
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
                        <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                          required
                        </Badge>
                      )}
                      {field.hint && (
                        <p className="text-xs text-muted-foreground mt-0.5">{field.hint}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={selectedCol}
                        onChange={(e) => setField(field.key, e.target.value)}
                        className={cn(
                          'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors',
                          'hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring/50',
                          field.required && !selectedCol && 'border-destructive/50 bg-destructive/5'
                        )}
                      >
                        {headerOptions.map((h) => (
                          <option key={h} value={h}>
                            {h || '— skip this field —'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                      {sample}
                    </td>
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
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={!allRequiredMapped}>
          Review import <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step 4: Confirm ──────────────────────────────────────────────────────────

function ConfirmStep({
  parsed,
  datasetType,
  validation,
  importing,
  error,
  onBack,
  onImport,
  sheetContext,
}: {
  parsed: ParseResult
  datasetType: DatasetType
  validation: ValidationResult
  importing: boolean
  error: string | null
  onBack: () => void
  onImport: () => void
  sheetContext?: { current: number; total: number; name: string } | null
}) {
  const isLastSheet = !sheetContext || sheetContext.current === sheetContext.total
  const buttonLabel = importing
    ? 'Importing…'
    : isLastSheet
    ? 'Import data'
    : `Import & continue to sheet ${(sheetContext?.current ?? 0) + 1}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-heading">Ready to import</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {sheetContext && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted border border-border px-2 py-0.5 text-[11px] font-medium mr-1.5">
              <Layers className="h-3 w-3" />
              Sheet {sheetContext.current} of {sheetContext.total}: {sheetContext.name}
            </span>
          )}
          Importing into <span className="font-medium">{DATASET_LABELS[datasetType]}</span>
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-muted/30 p-4 text-center">
          <p className="text-3xl font-bold text-primary">{validation.validCount.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Rows ready</p>
        </div>
        <div className={cn(
          'rounded-xl border p-4 text-center',
          validation.invalidCount > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'
        )}>
          <p className={cn(
            'text-3xl font-bold',
            validation.invalidCount > 0 ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {validation.invalidCount.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {validation.invalidCount > 0 ? 'Rows with issues (will be skipped)' : 'Rows with issues'}
          </p>
        </div>
      </div>

      {/* Validation errors */}
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
          <AlertDescription>
            No valid rows to import. Go back and fix the column mapping or check your file.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onImport} disabled={importing || validation.validCount === 0}>
          {buttonLabel}
          {!importing && !isLastSheet && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

// ── Step 5: Done ─────────────────────────────────────────────────────────────

function DoneStep({
  sheetResults,
  singleResult,
  onReset,
}: {
  sheetResults: SheetResult[]
  singleResult?: { imported: number; failed: number } | null
  onReset: () => void
}) {
  const isMultiSheet = sheetResults.length > 0
  const totalImported = isMultiSheet
    ? sheetResults.reduce((s, r) => s + r.imported, 0)
    : (singleResult?.imported ?? 0)
  const totalFailed = isMultiSheet
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
            {totalImported.toLocaleString()} {totalImported === 1 ? 'row' : 'rows'} imported successfully.
            {totalFailed > 0 && (
              <span className="text-destructive"> {totalFailed.toLocaleString()} skipped due to errors.</span>
            )}
          </p>
        </div>
      </div>

      {/* Per-sheet breakdown */}
      {isMultiSheet && (
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Sheet results
            </p>
          </div>
          <div className="divide-y divide-border">
            {sheetResults.map((r) => (
              <div key={r.name} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{DATASET_LABELS[r.datasetType]}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  {r.error ? (
                    <span className="text-destructive text-xs">{r.error}</span>
                  ) : (
                    <>
                      <span className="font-medium text-emerald-700">{r.imported.toLocaleString()} imported</span>
                      {r.failed > 0 && (
                        <span className="text-muted-foreground text-xs"> / {r.failed.toLocaleString()} skipped</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3">
        <Button onClick={onReset} variant="outline">Upload another file</Button>
        <Button asChild variant="outline"><a href="/uploads">View my files</a></Button>
        <Button asChild><a href="/dashboard">Go to dashboard</a></Button>
      </div>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function UploadPage() {
  // ── Core wizard state ──────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('drop')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [datasetType, setDatasetType] = useState<DatasetType | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  // Single-sheet result
  const [singleResult, setSingleResult] = useState<{ imported: number; failed: number } | null>(null)

  // ── Multi-sheet state ──────────────────────────────────────────────────────
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [workbookSheets, setWorkbookSheets] = useState<SheetInspection[] | null>(null)
  const [selectedSheetNames, setSelectedSheetNames] = useState<Set<string>>(new Set())
  const [sheetQueue, setSheetQueue] = useState<QueuedSheet[]>([])
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0)
  const [sheetResults, setSheetResults] = useState<SheetResult[]>([])
  const [workbookUploadId, setWorkbookUploadId] = useState<string | null>(null)

  const isMultiSheet = sheetQueue.length > 1
  const currentSheet = sheetQueue[currentSheetIdx] ?? null

  // ── Sheet context for step labels ──────────────────────────────────────────
  const sheetContext = isMultiSheet && currentSheet
    ? { current: currentSheetIdx + 1, total: sheetQueue.length, name: currentSheet.name }
    : null

  // ── Handlers ───────────────────────────────────────────────────────────────

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
        // Inspect all sheets
        const sheets = inspectWorkbook(buffer)
        const dataSheets = sheets.filter((s) => !s.defaultSkip && s.rowCount > 0 && s.headers.length >= 2)

        if (dataSheets.length >= 2) {
          // Multi-sheet workbook path
          setWorkbookSheets(sheets)
          setSelectedSheetNames(new Set(dataSheets.map((s) => s.name)))
          setSheetQueue([])
          setCurrentSheetIdx(0)
          setSheetResults([])
          setWorkbookUploadId(null)
          setStep('sheets')
          return
        }

        // Single-sheet XLSX — pick the first data sheet (or first sheet)
        const targetSheet = dataSheets[0] ?? sheets[0]
        if (!targetSheet) throw new Error('No sheets found in this file.')
        const result = parseSheet(buffer, targetSheet.name)
        setParsed(result)
      } else {
        // CSV
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

  function toggleSheet(name: string) {
    setSelectedSheetNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function handleSheetsContinue() {
    if (!fileBuffer || !workbookSheets) return
    setParsing(true)
    try {
      // Parse all selected sheets in workbook order
      const ordered = workbookSheets
        .filter((s) => selectedSheetNames.has(s.name))
      const queue: QueuedSheet[] = ordered.map((s) => ({
        name: s.name,
        parsed: parseSheet(fileBuffer, s.name),
        suggestedType: s.datasetType,
      }))
      setSheetQueue(queue)
      setCurrentSheetIdx(0)
      // Pre-fill state for first sheet
      const first = queue[0]
      setParsed(first.parsed)
      const suggested = first.suggestedType
      setDatasetType(suggested)
      setMapping(suggested ? autoMap(first.parsed.headers, suggested) : {})
      setValidation(null)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read sheets.')
    } finally {
      setParsing(false)
    }
  }

  function handleDatasetType(type: DatasetType) {
    setDatasetType(type)
    if (parsed) setMapping(autoMap(parsed.headers, type))
  }

  function handleGoToMapping() {
    setStep('mapping')
  }

  function handleGoToConfirm() {
    if (!parsed || !datasetType) return
    const v = validateRows(parsed.rows, mapping, datasetType)
    setValidation(v)
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
      sheetName: isMultiSheet ? currentSheet?.name : undefined,
      existingUploadId: isMultiSheet ? (workbookUploadId ?? undefined) : undefined,
    })

    setImporting(false)

    if (res.error) {
      setError(res.error)
      return
    }

    // Capture upload ID for subsequent sheets
    if (isMultiSheet && !workbookUploadId && res.uploadId) {
      setWorkbookUploadId(res.uploadId)
    }

    const result: SheetResult = {
      name: currentSheet?.name ?? file.name,
      datasetType,
      imported: res.imported ?? 0,
      failed: res.failed ?? 0,
    }

    if (isMultiSheet) {
      const newResults = [...sheetResults, result]
      setSheetResults(newResults)

      const nextIdx = currentSheetIdx + 1
      if (nextIdx < sheetQueue.length) {
        // Advance to next sheet
        const next = sheetQueue[nextIdx]
        setCurrentSheetIdx(nextIdx)
        setParsed(next.parsed)
        const suggested = next.suggestedType
        setDatasetType(suggested)
        setMapping(suggested ? autoMap(next.parsed.headers, suggested) : {})
        setValidation(null)
        setStep('preview')
      } else {
        // All sheets done — finalise the workbook upload record
        const uid = workbookUploadId ?? res.uploadId
        if (uid) {
          const anySucceeded = newResults.some((r) => r.imported > 0)
          await finaliseWorkbookUpload(uid, anySucceeded)
        }
        setStep('done')
      }
    } else {
      setSingleResult({ imported: res.imported ?? 0, failed: res.failed ?? 0 })
      setStep('done')
    }
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
    setSelectedSheetNames(new Set())
    setSheetQueue([])
    setCurrentSheetIdx(0)
    setSheetResults([])
    setWorkbookUploadId(null)
    setError(null)
  }

  // Back from preview: go to sheets step if multi-sheet workbook, else drop
  function handlePreviewBack() {
    if (workbookSheets && workbookSheets.length > 0) {
      setStep('sheets')
    } else {
      setStep('drop')
    }
  }

  // Back from mapping: if we're past sheet 0, we can't undo the previous import
  // so just go back to preview for the current sheet
  function handleMappingBack() {
    setStep('preview')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-8 py-7 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight font-heading">Import data</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Upload a CSV or Excel file — we&apos;ll walk you through the rest.
        </p>
      </div>

      {step !== 'done' && <StepIndicator current={step} isMultiSheet={isMultiSheet || (workbookSheets?.length ?? 0) > 1} />}

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {step === 'drop' && !parsing && (
          <DropStep onFile={handleFile} error={error} />
        )}

        {parsing && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm">Reading your file…</p>
          </div>
        )}

        {step === 'sheets' && workbookSheets && file && !parsing && (
          <SheetsStep
            fileName={file.name}
            sheets={workbookSheets}
            selected={selectedSheetNames}
            onToggle={toggleSheet}
            onBack={() => setStep('drop')}
            onContinue={handleSheetsContinue}
          />
        )}

        {step === 'preview' && parsed && file && (
          <PreviewStep
            file={file}
            parsed={parsed}
            datasetType={datasetType}
            onDatasetType={handleDatasetType}
            onBack={handlePreviewBack}
            onNext={handleGoToMapping}
            sheetContext={sheetContext}
          />
        )}

        {step === 'mapping' && parsed && datasetType && (
          <MappingStep
            parsed={parsed}
            datasetType={datasetType}
            mapping={mapping}
            onMapping={setMapping}
            onBack={handleMappingBack}
            onNext={handleGoToConfirm}
            sheetContext={sheetContext}
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
            sheetContext={sheetContext}
          />
        )}

        {step === 'done' && (
          <DoneStep
            sheetResults={sheetResults}
            singleResult={singleResult}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  )
}
