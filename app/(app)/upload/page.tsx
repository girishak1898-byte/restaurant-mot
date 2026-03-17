'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, ChefHat, ClipboardList, Users, Upload, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { parseFile, type ParseResult } from '@/lib/upload/parse'
import { validateRows, type ValidationResult } from '@/lib/upload/validate'
import { autoMap, DATASET_DESCRIPTIONS, DATASET_FIELDS, DATASET_LABELS, type DatasetType } from '@/lib/upload/schemas'
import { saveUpload } from '@/lib/actions/upload'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'drop' | 'preview' | 'mapping' | 'confirm' | 'done'

const STEP_ORDER: Step[] = ['drop', 'preview', 'mapping', 'confirm', 'done']
const STEP_LABELS: Record<Step, string> = {
  drop: 'Upload file',
  preview: 'Select type',
  mapping: 'Map columns',
  confirm: 'Import',
  done: 'Done',
}

const DATASET_ICONS: Record<DatasetType, React.ReactNode> = {
  restaurant_sales: <ChefHat className="h-5 w-5" />,
  restaurant_menu_items: <ClipboardList className="h-5 w-5" />,
  restaurant_labour_shifts: <Users className="h-5 w-5" />,
}

// ── Utilities ────────────────────────────────────────────────────────────────

function getFileType(file: File): 'csv' | 'xlsx' | null {
  if (file.name.endsWith('.csv')) return 'csv'
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'xlsx'
  return null
}

function getSampleValue(
  rows: Record<string, string>[],
  col: string
): string {
  for (const row of rows) {
    const v = row[col]?.trim()
    if (v) return v.length > 30 ? v.slice(0, 30) + '…' : v
  }
  return '—'
}

// ── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const visibleSteps = STEP_ORDER.filter((s) => s !== 'done')
  const currentIndex = STEP_ORDER.indexOf(current)
  return (
    <div className="flex items-center gap-0 mb-8">
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

// ── Step 1: Drop ─────────────────────────────────────────────────────────────

function DropStep({
  onFile,
  error,
}: {
  onFile: (file: File) => void
  error: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    onFile(files[0])
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Upload your file</h2>
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
        <p className="text-sm font-medium">Drop your file here, or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">Supports .csv and .xlsx files</p>
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
}: {
  file: File
  parsed: ParseResult
  datasetType: DatasetType | null
  onDatasetType: (t: DatasetType) => void
  onBack: () => void
  onNext: () => void
}) {
  const types: DatasetType[] = ['restaurant_sales', 'restaurant_menu_items', 'restaurant_labour_shifts']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">What type of data is this?</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          <span className="font-medium">{file.name}</span> — {parsed.totalRows.toLocaleString()} rows detected
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
        <p className="text-[11px] font-medium mb-2 text-muted-foreground uppercase tracking-wider">Preview (first 5 rows)</p>
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
          Map columns <ArrowRight className="h-4 w-4" />
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

  function setField(fieldKey: string, col: string) {
    onMapping({ ...mapping, [fieldKey]: col || '' })
  }

  const headerOptions = ['', ...parsed.headers]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Map your columns</h2>
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

// ── Step 4: Confirm ───────────────────────────────────────────────────────────

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
        <h2 className="text-lg font-semibold">Ready to import</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
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
        <Button
          onClick={onImport}
          disabled={importing || validation.validCount === 0}
        >
          {importing
            ? 'Importing…'
            : `Import ${validation.validCount.toLocaleString()} rows`}
        </Button>
      </div>
    </div>
  )
}

// ── Step 5: Done ──────────────────────────────────────────────────────────────

function DoneStep({
  imported,
  failed,
  onReset,
}: {
  imported: number
  failed: number
  onReset: () => void
}) {
  return (
    <div className="text-center space-y-4 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Import complete</h2>
        <p className="text-muted-foreground mt-1">
          {imported.toLocaleString()} {imported === 1 ? 'row' : 'rows'} imported successfully.
          {failed > 0 && (
            <span className="text-destructive"> {failed.toLocaleString()} skipped due to errors.</span>
          )}
        </p>
      </div>
      <div className="flex justify-center gap-3 pt-2">
        <Button onClick={onReset} variant="outline">
          Upload another file
        </Button>
        <Button asChild variant="outline">
          <a href="/uploads">View my files</a>
        </Button>
        <Button asChild>
          <a href="/dashboard">Go to dashboard</a>
        </Button>
      </div>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [step, setStep] = useState<Step>('drop')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [datasetType, setDatasetType] = useState<DatasetType | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

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
      const result = await parseFile(f)
      setFile(f)
      setParsed(result)
      setDatasetType(null)
      setMapping({})
      setValidation(null)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.')
    } finally {
      setParsing(false)
    }
  }

  function handleDatasetType(type: DatasetType) {
    setDatasetType(type)
    // Re-run automap whenever dataset type changes
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
    // Only pass valid rows (filter out invalid ones)
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

    if (res.error) {
      setError(res.error)
      return
    }

    setResult({ imported: res.imported ?? 0, failed: res.failed ?? 0 })
    setStep('done')
  }

  function handleReset() {
    setStep('drop')
    setFile(null)
    setParsed(null)
    setDatasetType(null)
    setMapping({})
    setValidation(null)
    setResult(null)
    setError(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-8 py-7 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Import data</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Upload a CSV or Excel file — we&apos;ll walk you through the rest.
        </p>
      </div>

      {step !== 'done' && <StepIndicator current={step} />}

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {step === 'drop' && !parsing && (
          <DropStep
            onFile={handleFile}
            error={error}
          />
        )}
        {parsing && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm">Reading your file…</p>
          </div>
        )}

        {step === 'preview' && parsed && file && (
          <PreviewStep
            file={file}
            parsed={parsed}
            datasetType={datasetType}
            onDatasetType={handleDatasetType}
            onBack={() => setStep('drop')}
            onNext={handleGoToMapping}
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

        {step === 'done' && result && (
          <DoneStep
            imported={result.imported}
            failed={result.failed}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  )
}
